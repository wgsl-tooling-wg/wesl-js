import {
  enableTracing,
  matchingLexer,
  matchOneOf,
  NoTags,
  OptParserResult,
  Parser,
  TagRecord,
  TokenMatcher,
  tokenMatcher,
  tracing,
  _withBaseLogger,
} from "@wesl/mini-parse";
import { expect } from "vitest";
import { logCatch } from "./LogCatcher.ts";

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

export interface TestParseResult<T, N extends TagRecord = NoTags, S = any> {
  parsed: OptParserResult<T, N>;
  position: number;
  appState: S[];
}

/** utility for testing parsers */
export function testParse<T, N extends TagRecord = NoTags, S = any>(
  p: Parser<T, N>,
  src: string,
  tokenMatcher: TokenMatcher = testTokens,
): TestParseResult<T, N, S> {
  const lexer = matchingLexer(src, tokenMatcher);
  const app = {
    state: [],
    context: undefined,
  };
  const parsed = p.parse({ lexer, app, maxParseCount: 1000 });
  return { parsed, position: lexer.position(), appState: app.state };
}

/** run a test function and expect that no error logs are produced. If used with an async function, make sure that all calls to log happen within the sync part */
export function expectNoLogErr<T>(fn: () => T): T {
  const { log, logged } = logCatch();
  const result = _withBaseLogger(log, fn);
  expect(logged()).toBe("");
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
