import { srcTrace } from "./ParserLogging.js";
import { tracing } from "./ParserTracing.js";
import { SrcMap } from "./SrcMap.js";
import { Token, TokenMatcher } from "./TokenMatcher.js";

export interface Lexer {
  /** return the next token, advancing the the current position */
  next(): Token | undefined;

  /** run a function with a substitute tokenMatcher */
  withMatcher<T>(newMatcher: TokenMatcher, fn: () => T): T;

  /** run a function with a substitute set of token kinds to ignore */
  withIgnore<T>(newIgnore: IgnoreFn | null, fn: () => T): T;

  /** get or set the current position in the src */
  position(pos?: number): number;

  /** true if the parser is at the end of the src string */
  eof(): boolean;

  /** src text */
  src: string;
}

interface MatcherStackElem {
  matcher: TokenMatcher;
  ignoreFn: IgnoreFn;
}

/**
 * To ignore a token, return the start index of where we should look for the next token.
 *
 * Note: This could be extended to handle nested languages, by extending the return types
 * to `enum { Keep, Skip(newPosition), NestedParse(newPosition, result) }` and parsing
 * inside of this function.
 */
export type IgnoreFn = (token: Token, src: string) => null | number;

function defaultIgnorer(token: Token, src: string): null | number {
  if (token.kind === "ws") {
    return token.span[1];
  } else {
    return null;
  }
}

export function matchingLexer(
  src: string,
  rootMatcher: TokenMatcher,
  ignoreFn: IgnoreFn = defaultIgnorer,
  srcMap?: SrcMap,
): Lexer {
  let matcher = rootMatcher;
  const matcherStack: MatcherStackElem[] = [];

  matcher.start(src);

  function next(): Token | undefined {
    const start = matcher.position;
    const { token } = toNextToken();
    if (tracing && token) {
      const text = quotedText(token?.text);
      srcTrace(srcMap ?? src, start, `: ${text} (${token?.kind})`);
    }
    return token;
  }

  /** Advance to the next token
   * @return the token, and the position at the start of the token (after ignored ws) */
  function toNextToken(): { p: number; token?: Token } {
    while (true) {
      let p = matcher.position;
      if (eof()) return { p };
      // advance til we find a token we're not ignoring
      let token = matcher.next();
      if (token === undefined) {
        return { p, token: undefined };
      }
      let skip = ignoreFn(token, src);
      if (skip === null) {
        return { p, token };
      } else {
        matcher.position = skip;
      }
    }
  }

  function pushMatcher(newMatcher: TokenMatcher, newIgnore: IgnoreFn): void {
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

  function withIgnore<T>(newIgnore: IgnoreFn | null, fn: () => T): T {
    return withMatcherIgnore(matcher, newIgnore ?? defaultIgnorer, fn);
  }

  function withMatcherIgnore<T>(
    tokenMatcher: TokenMatcher,
    ignoreFn: IgnoreFn,
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
    src,
  };
}

export function quotedText(text?: string): string {
  return text ? `'${text.replace(/\n/g, "\\n")}'` : "";
}
