import { srcTrace } from "./ParserLogging.js";
import { tracing } from "./ParserTracing.js";
import { Span } from "./Span.js";
import { SrcMap } from "./SrcMap.js";
import { Stream, Token } from "./Stream.js";
import { OldToken, TokenMatcher } from "./TokenMatcher.js";

export interface Lexer {
  /** return the next token, advancing the the current position */
  next(): OldToken | undefined;

  /** run a function with a substitute tokenMatcher */
  withMatcher<T>(newMatcher: TokenMatcher, fn: () => T): T;

  /** run a function with a substitute set of token kinds to ignore */
  withIgnore<T>(newIgnore: boolean, fn: () => T): T;

  /** get or set the current position in the src */
  position(pos?: number): number;

  /** true if the parser is at the end of the src string */
  eof(): boolean;

  /** skip past any ignored tokens and return the current position in the src */
  skipIgnored(): number;

  /** src text */
  src: string;
}

interface MatcherStackElem {
  matcher: TokenMatcher;
  ignoreFn: boolean;
}

export class LexerFromStream<T extends Token> implements Lexer {
  constructor(
    private stream: Stream<T>,
    public src: string,
  ) {}
  next(): OldToken | undefined {
    const result = this.stream.nextToken();
    if (result === null) return undefined;
    return {
      kind: result.kind,
      text: result.value,
    };
  }
  withMatcher<T>(newMatcher: TokenMatcher, fn: () => T): T {
    throw new Error("Method not implemented.");
  }
  withIgnore<T>(newIgnore: boolean, fn: () => T): T {
    throw new Error("Method not implemented.");
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
  const matcherStack: MatcherStackElem[] = [];

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

  function pushMatcher(newMatcher: TokenMatcher, newIgnore: boolean): void {
    const position = matcher.position;
    matcherStack.push({ matcher, ignoreFn });
    newMatcher.start(src, position);
    matcher = newMatcher;
    ignoreFn = newIgnore;
  }

  function popMatcher(): void {
    const position = matcher.position;
    const elem = matcherStack.pop();
    if (!elem) {
      console.error("too many pops");
      return;
    }
    matcher = elem.matcher;
    ignoreFn = elem.ignoreFn;

    matcher.position = position;
  }

  function position(pos?: number): number {
    if (pos !== undefined) {
      matcher.start(src, pos);
    }
    return matcher.position;
  }

  function withMatcher<T>(newMatcher: TokenMatcher, fn: () => T): T {
    return withMatcherIgnore(newMatcher, ignoreFn, fn);
  }

  function withIgnore<T>(newIgnore: boolean, fn: () => T): T {
    return withMatcherIgnore(matcher, newIgnore, fn);
  }

  function withMatcherIgnore<T>(
    tokenMatcher: TokenMatcher,
    ignoreFn: boolean,
    fn: () => T,
  ): T {
    pushMatcher(tokenMatcher, ignoreFn);
    const result = fn();
    popMatcher();
    return result;
  }

  function eof(): boolean {
    return matcher.position === src.length;
  }

  return {
    next,
    position,
    withMatcher,
    withIgnore,
    eof,
    skipIgnored,
    src,
  };
}

export function quotedText(text?: string): string {
  return text ? `'${text.replace(/\n/g, "\\n")}'` : "";
}
