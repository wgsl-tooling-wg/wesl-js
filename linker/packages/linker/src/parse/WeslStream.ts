import {
  TypedToken,
  Stream,
  CachingStream,
  MatchersStream,
  RegexMatchers,
  matchOneOf,
  withLexerAction,
} from "mini-parse";
import { keywords, reservedWords } from "./Keywords";
export type WeslTokenKind = "word" | "keyword" | "number" | "symbol";

export interface WeslToken extends TypedToken<WeslTokenKind> {}

// https://www.w3.org/TR/WGSL/#blankspace-and-line-breaks
/** Whitespaces including new lines */
const blankspaces = /[ \t\n\v\f\r\u{0085}\u{200E}\u{200F}\u{2028}\u{2029}]+/u;
const symbolSet =
  "& && -> @ / ! [ ] { } :: : , == = != >>= >> >= > <<= << <= < % - --" +
  " . + ++ | || ( ) ; * ~ ^ // /* */ += -= *= /= %= &= |= ^=" +
  // For the _ = expr; syntax
  " _";

const ident =
  /(?:(?:[_\p{XID_Start}][\p{XID_Continue}]+)|(?:[\p{XID_Start}]))/u;

const keywordOrReserved = new Set(keywords.concat(reservedWords));

const digits = new RegExp(
  // decimal_float_literal
  /(?:0[fh])|(?:[1-9][0-9]*[fh])/.source +
    /|(?:[0-9]*\.[0-9]+(?:[eE][+-]?[0-9]+)?[fh]?)/.source +
    /|(?:[0-9]+\.[0-9]*(?:[eE][+-]?[0-9]+)?[fh]?)/.source +
    /|(?:[0-9]+[eE][+-]?[0-9]+[fh]?)/.source +
    // hex_float_literal
    /|(?:0[xX][0-9a-fA-F]*\.[0-9a-fA-F]+(?:[pP][+-]?[0-9]+[fh]?)?)/.source +
    /|(?:0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*(?:[pP][+-]?[0-9]+[fh]?)?)/.source +
    /|(?:0[xX][0-9a-fA-F]+[pP][+-]?[0-9]+[fh]?)/.source +
    // hex_int_literal
    /|(?:0[xX][0-9a-fA-F]+[iu]?)/.source +
    // decimal_int_literal
    /|(?:0[iu]?)|(?:[1-9][0-9]*[iu]?)/.source,
);

const commentStart = /\/\/|\/\*/;

type InternalTokenKind =
  | "word"
  | "number"
  | "blankspaces"
  | "commentStart"
  | "symbol";
const weslMatcher = new RegexMatchers<InternalTokenKind>({
  word: ident,
  number: digits,
  blankspaces,
  commentStart,
  symbol: matchOneOf(symbolSet),
});

export class WeslStream implements Stream<WeslToken> {
  private stream: Stream<TypedToken<InternalTokenKind>>;
  /** New line */
  private eolPattern = /[\n\v\f\u{0085}\u{2028}\u{2029}]|\r\n?/gu;
  /** Block comments */
  private blockCommentPattern = /\/\*|\*\//g;
  constructor(public src: string) {
    this.stream = new CachingStream(new MatchersStream(src, weslMatcher));
  }
  checkpoint(): number {
    return this.stream.checkpoint();
  }
  reset(position: number): void {
    this.stream.reset(position);
  }
  nextToken(): WeslToken | null {
    while (true) {
      const token = this.stream.nextToken();
      if (token === null) return null;

      if (token.kind === "blankspaces") {
        continue;
      } else if (token.kind === "commentStart") {
        // SAFETY: The underlying streams can be seeked to any position
        if (token.text === "//") {
          this.stream.reset(this.skipToEol(token.span[1]));
        } else {
          this.stream.reset(this.skipBlockComment(token.span[1]));
        }
      } else if (token.kind === "word") {
        const kind = token.kind;
        let returnToken = token as TypedToken<typeof kind | "keyword">;
        if (keywordOrReserved.has(token.text)) {
          returnToken.kind = "keyword";
        }
        return returnToken;
      } else {
        const kind = token.kind;
        return token as TypedToken<typeof kind>;
      }
    }
  }

  private skipToEol(position: number): number {
    this.eolPattern.lastIndex = position;
    const result = this.eolPattern.exec(this.src);
    if (result === null) {
      // We reached the end of the file
      return this.src.length;
    } else {
      // Move forward
      return this.eolPattern.lastIndex;
    }
  }

  private skipBlockComment(position: number): number {
    while (true) {
      this.blockCommentPattern.lastIndex = position;
      const result = this.blockCommentPattern.exec(this.src);
      if (result === null) {
        // TODO: Proper error reporting?
        throw new Error("Unclosed block comment!");
      } else if (result[0] === "*/") {
        // Close block
        return this.blockCommentPattern.lastIndex;
      } else if (result[0] === "/*") {
        // Open block
        position = this.skipBlockComment(this.blockCommentPattern.lastIndex);
      } else {
        throw new Error("Unreachable, invalid block comment pattern");
      }
    }
  }

  /** Only matches the `<` and `>` tokens */
  nextTemplateToken(): (WeslToken & { kind: "symbol" }) | null {
    const startPosition = this.stream.checkpoint();
    const token: WeslToken | null = this.nextToken();
    this.stream.reset(startPosition);
    if (token === null) return null;

    if (token.kind !== "symbol") {
      return null;
    }

    const tokenStart = token.text[0];
    if (tokenStart === "<" || tokenStart === ">") {
      // SAFETY: The underlying streams implementations can be reset to any position.
      const tokenPosition = token.span[0];
      this.stream.reset(tokenPosition + 1);
      return {
        kind: "symbol",
        span: [tokenPosition, tokenPosition + 1],
        text: tokenStart,
      };
    } else {
      return null;
    }
  }
}

export const templateOpen = withLexerAction(lexer => {
  let result = (lexer.stream as any).nextTemplateToken() as WeslToken | null;
  if (result?.text === "<") {
    return "<";
  } else {
    return null;
  }
});
export const templateClose = withLexerAction(lexer => {
  let result = (lexer.stream as any).nextTemplateToken() as WeslToken | null;
  if (result?.text === ">") {
    return ">";
  } else {
    return null;
  }
});
