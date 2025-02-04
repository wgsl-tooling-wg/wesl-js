import {
  AppState,
  enableTracing,
  Lexer,
  LexerFromStream,
  MatchersStream,
  matchOneOf,
  OptParserResult,
  Parser,
  RegexMatchers,
  Stream,
  Token,
  tracing,
  withLogger,
} from "mini-parse";
import { expect } from "vitest";
import { logCatch } from "./LogCatcher.js";
import { FilterStream } from "../stream/FilterStream.js";

const symbolSet =
  "& && -> @ / ! [ ] { } : , = == != > >= < << <= % - -- ' \"" +
  ". + ++ | || ( ) ; * ~ ^ // /* */ += -= *= /= %= &= |= ^= >>= <<= <<";
export type TestMatcherKind =
  | "directive"
  | "word"
  | "attr"
  | "symbol"
  | "digits"
  | "ws";
export const testMatcher = new RegexMatchers<TestMatcherKind>({
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
  p: Parser<Stream<Token>, T>,
  src: string,
  tokenMatcher: RegexMatchers<string> = testMatcher,
  appState: AppState<C, S> = { context: {} as C, stable: [] as S },
): TestParseResult<T, S> {
  const lexer = new LexerFromStream(
    new FilterStream(
      new MatchersStream(src, tokenMatcher),
      t => t.kind !== "ws",
    ),
    src,
  );
  const parsed = p.parse({ lexer, appState: appState, maxParseCount: 1000 });
  return { parsed, position: lexer.position(), stable: appState.stable };
}

export function testParseWithLexer<T, C = any, S = any>(
  p: Parser<Stream<Token>, T>,
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
