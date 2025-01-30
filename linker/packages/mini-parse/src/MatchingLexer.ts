import { srcTrace } from "./ParserLogging.js";
import { tracing } from "./ParserTracing.js";
import { Span } from "./Span.js";
import { SrcMap } from "./SrcMap.js";
import { Stream, Token } from "./Stream.js";
import { OldToken, TokenMatcher } from "./TokenMatcher.js";

export interface Lexer {
  /** return the next token, advancing the the current position */
  next(): OldToken | undefined;

  /** get or set the current position in the src */
  position(pos?: number): number;

  /** true if the parser is at the end of the src string */
  eof(): boolean;

  /** skip past any ignored tokens and return the current position in the src */
  skipIgnored(): number;

  /** src text */
  src: string;

  stream?: Stream<Token>;
}

export class LexerFromStream<T extends Token> implements Lexer {
  constructor(
    public stream: Stream<T>,
    public src: string,
  ) {}
  next(): OldToken | undefined {
    const result = this.stream.nextToken();
    if (result === null) return undefined;
    return {
      kind: result.kind,
      text: result.value,
      span: result.span,
    };
  }
  position(pos?: number): number {
    if (pos !== undefined) {
      this.stream.reset(pos);
    }
    return this.stream.checkpoint();
  }
  eof(): boolean {
    return this.stream.eofOffset() <= 0;
  }
  skipIgnored(): number {
    const result = this.stream.nextToken();
    if (result === null) {
      // Position of EOF
      return this.stream.checkpoint();
    } else {
      this.stream.reset(result.span[0]);
      return this.stream.checkpoint();
    }
  }
}

export function matchingLexer(
  src: string,
  rootMatcher: TokenMatcher,
  /** TODO: This is just a temp hack to make refactoring easy */
  ignoreFn = true,
  srcMap?: SrcMap,
): Lexer {
  let matcher = rootMatcher;
  matcher.start(src);

  function next(): OldToken | undefined {
    const start = matcher.position;
    const { token } = toNextToken();
    if (tracing && token) {
      const text = quotedText(token?.text);
      srcTrace(srcMap ?? src, start, `: ${text} (${token?.kind})`);
    }
    return token;
  }

  function skipIgnored(): number {
    const { p } = toNextToken();

    // back up to the position before the first non-ignored token
    matcher.position = p;
    return p;
  }

  /** Advance to the next token
   * @return the token, and the position at the start of the token (after ignored ws) */
  function toNextToken(): { p: number; token?: OldToken } {
    while (true) {
      let p = matcher.position;
      if (eof()) return { p };
      // advance til we find a token we're not ignoring
      let token = matcher.next();
      if (token === undefined) {
        return { p, token: undefined };
      }
      let skip = ignoreFn && token.kind === "ws";
      if (!skip) {
        return { p, token };
      }
    }
  }

  function position(pos?: number): number {
    if (pos !== undefined) {
      matcher.start(src, pos);
    }
    return matcher.position;
  }

  function eof(): boolean {
    return matcher.position === src.length;
  }

  return {
    next,
    position,
    eof,
    skipIgnored,
    src,
  };
}

export function quotedText(text?: string): string {
  return text ? `'${text.replace(/\n/g, "\\n")}'` : "";
}
