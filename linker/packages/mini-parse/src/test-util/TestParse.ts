import {
  AppState,
  enableTracing,
  Lexer,
  matchingLexer,
  matchOneOf,
  OptParserResult,
  Parser,
  TokenMatcher,
  tokenMatcher,
  tracing,
  withLogger,
} from "mini-parse";
import { expect } from "vitest";
import { logCatch } from "./LogCatcher.js";

const symbolSet =
  "& && -> @ / ! [ ] { } : , = == != > >= < << <= % - -- ' \"" +
  ". + ++ | || ( ) ; * ~ ^ // /* */ += -= *= /= %= &= |= ^= >>= <<= <<";
export const testTokens = tokenMatcher({
  directive: /#[a-zA-Z_]\w*/,
  word: /[a-zA-Z_]\w*/,
  attr: /@[a-zA-Z_]\w*/,
  symbol: matchOneOf(symbolSet),
  digits: /\d+/,
  ws: /\s+/,
});

export interface TestParseResult<T, S = any> {
  parsed: OptParserResult<T>;
  position: number;
  stable: S;
}

/** utility for testing parsers */
export function testParse<T, C = any, S = any>(
  p: Parser<T>,
  src: string,
  tokenMatcher: TokenMatcher = testTokens,
  appState: AppState<C, S> = { context: {} as C, stable: [] as S },
): TestParseResult<T, S> {
  const lexer = matchingLexer(src, tokenMatcher);
  const parsed = p.parse({ lexer, appState: appState, maxParseCount: 1000 });
  return { parsed, position: lexer.position(), stable: appState.stable };
}

export function testParseWithLexer<T, C = any, S = any>(
  p: Parser<T>,
  lexer: Lexer,
  appState: AppState<C, S> = { context: {} as C, stable: [] as S },
): TestParseResult<T, S> {
  const parsed = p.parse({ lexer, appState: appState, maxParseCount: 1000 });
  return { parsed, position: lexer.position(), stable: appState.stable };
}

/** run a test function and expect that no error logs are produced */
export function expectNoLog<T>(fn: () => T): T {
  const { log, logged } = logCatch();
  let result: T | undefined = undefined;

  try {
    result = withLogger(log, fn);
  } finally {
    if (logged()) {
      console.log(logged());
    }
    expect(logged()).toBe("");
  }
  return result;
}

/** run a test with tracing facility disabled
 * (e.g. if the tracing facility might interfere with the test) */
export function withTracingDisabled(fn: () => void): void {
  const tracingWasEnabled = tracing;
  enableTracing(false);
  try {
    fn();
  } finally {
    enableTracing(tracingWasEnabled);
  }
}
