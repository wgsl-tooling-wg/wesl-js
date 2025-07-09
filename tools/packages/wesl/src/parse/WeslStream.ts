import {
  CachingStream,
  MatchersStream,
  matchOneOf,
  ParseError,
  RegexMatchers,
  type Stream,
  type TypedToken,
  withStreamAction,
} from "mini-parse";
import { keywords, reservedWords } from "./Keywords.ts";
export type WeslTokenKind = "word" | "keyword" | "number" | "symbol";

export type WeslToken<Kind extends WeslTokenKind = WeslTokenKind> =
  TypedToken<Kind>;

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

/** Checks if a word is a valid WGSL ident, and not a keyword */
export function isIdent(text: string): boolean {
  if (text.match(ident)?.[0] !== text) {
    return false;
  }
  if (keywordOrReserved.has(text)) {
    return false;
  }
  return true;
}

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
  | "symbol"
  | "invalid";
const weslMatcher = new RegexMatchers<InternalTokenKind>({
  word: ident,
  number: digits,
  blankspaces,
  commentStart,
  symbol: matchOneOf(symbolSet),
  // biome-ignore lint/correctness/noEmptyCharacterClassInRegex: TODO
  invalid: /[^]/,
});

/** To mark parts of the grammar implementation that are WESL specific extensions */
export function weslExtension<T>(combinator: T): T {
  return combinator;
}

/** A stream that produces WESL tokens, skipping over comments and white space */
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

      const kind = token.kind;
      if (kind === "blankspaces") {
        continue;
      } else if (kind === "commentStart") {
        // SAFETY: The underlying streams can be seeked to any position
        if (token.text === "//") {
          this.stream.reset(this.skipToEol(token.span[1]));
        } else {
          this.stream.reset(this.skipBlockComment(token.span[1]));
        }
      } else if (kind === "word") {
        const returnToken = token as TypedToken<typeof kind | "keyword">;
        if (keywordOrReserved.has(token.text)) {
          returnToken.kind = "keyword";
        }
        return returnToken;
      } else if (kind === "invalid") {
        throw new ParseError("Invalid token " + token.text, token.span);
      } else {
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

  private skipBlockComment(start: number): number {
    let position = start;
    while (true) {
      this.blockCommentPattern.lastIndex = position;
      const result = this.blockCommentPattern.exec(this.src);
      if (result === null) {
        throw new ParseError("Unclosed block comment!", [position, position]);
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

  /**
   * Only matches the `<` token if it is a template
   * Precondition: An ident was parsed right before this.
   * Runs the [template list discovery algorithm](https://www.w3.org/TR/WGSL/#template-list-discovery).
   */
  nextTemplateStartToken(): (WeslToken & { kind: "symbol" }) | null {
    const startPosition = this.stream.checkpoint();
    const token: WeslToken | null = this.nextToken();
    this.stream.reset(startPosition);
    if (token === null) return null;

    if (token.kind !== "symbol") {
      return null;
    }

    //<<= << <= cannot be templates, so we match the entire token text
    if (token.text === "<") {
      if (this.isTemplateStart(token.span[1])) {
        this.stream.reset(token.span[1]);
        return token as WeslToken & { kind: typeof token.kind };
      } else {
        this.stream.reset(startPosition);
        return null;
      }
    } else {
      return null;
    }
  }

  nextTemplateEndToken(): (WeslToken & { kind: "symbol" }) | null {
    const startPosition = this.stream.checkpoint();
    const token: WeslToken | null = this.nextToken();
    this.stream.reset(startPosition);
    if (token === null) return null;

    // template closing can also match a >= or >>, so we split the token
    if (token.kind === "symbol" && token.text[0] === ">") {
      // SAFETY: The underlying streams implementations can be reset to any position.
      const tokenPosition = token.span[0];
      this.stream.reset(tokenPosition + 1);
      return {
        kind: "symbol",
        span: [tokenPosition, tokenPosition + 1],
        text: ">",
      };
    } else {
      return null;
    }
  }

  isTemplateStart(afterToken: number): boolean {
    // Skip over <
    this.stream.reset(afterToken);
    // We start with a < token
    let pendingCounter = 1;
    while (true) {
      const nextToken = this.stream.nextToken();
      if (nextToken === null) return false;
      if (nextToken.kind !== "symbol") continue;
      if (nextToken.text === "<") {
        // Start a nested template
        pendingCounter += 1;
      } else if (nextToken.text[0] === ">") {
        if (nextToken.text === ">" || nextToken.text === ">=") {
          pendingCounter -= 1;
        } else if (nextToken.text === ">>=" || nextToken.text === ">>") {
          pendingCounter -= 2;
        } else {
          throw new Error(
            "This case should never be reached, looks like we forgot one of the tokens that start with >",
          );
        }
        if (pendingCounter <= 0) {
          return true;
        }
      } else if (nextToken.text === "(") {
        this.skipBracketsTo(")");
      } else if (nextToken.text === "[") {
        this.skipBracketsTo("]");
      } else if (
        nextToken.text === "==" ||
        nextToken.text === "!=" ||
        nextToken.text === ";" ||
        nextToken.text === "{" ||
        nextToken.text === ":" ||
        nextToken.text === "&&" ||
        nextToken.text === "||"
      ) {
        return false;
      }
    }
  }

  /**
   * Call this after consuming an opening bracket.
   * Skips until a closing bracket. This also consumes the closing bracket.
   */
  skipBracketsTo(closingBracket: string) {
    while (true) {
      const nextToken = this.stream.nextToken();
      if (nextToken === null) {
        const after = this.stream.checkpoint();
        throw new ParseError("Unclosed bracket!", [after, after]);
      }
      if (nextToken.kind !== "symbol") continue;
      if (nextToken.text === "(") {
        this.skipBracketsTo(")");
      } else if (nextToken.text === "[") {
        this.skipBracketsTo("]");
      } else if (nextToken.text === closingBracket) {
        // We're done!
        return;
      }
    }
  }
}

export const templateOpen = withStreamAction(stream => {
  return (stream as WeslStream).nextTemplateStartToken();
});
export const templateClose = withStreamAction(stream => {
  return (stream as WeslStream).nextTemplateEndToken();
});
