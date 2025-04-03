import {
  type AppState,
  enableTracing,
  MatchersStream,
  matchOneOf,
  type OptParserResult,
  type Parser,
  RegexMatchers,
  type Stream,
  type Token,
  tracing,
  withLogger,
  withLoggerAsync,
} from "../mod.ts";
import { expect, test } from "vitest";
import { FilterStream } from "../stream/FilterStream.ts";
import { logCatch } from "./LogCatcher.ts";

const symbolSet = "& && -> @ / ! [ ] { } : , = == != > >= < << <= % - -- ' \"" +
  ". + ++ | || ( ) ; * ~ ^ // /* */ += -= *= /= %= &= |= ^= >>= <<= <<";
export type TestMatcherKind =
  | "directive"
  | "word"
  | "attr"
  | "symbol"
  | "digits"
  | "ws";
export const testMatcher: RegexMatchers<TestMatcherKind> = new RegexMatchers<
  TestMatcherKind
>({
  directive: /#[a-zA-Z_]\w*/,
  word: /[a-zA-Z_]\w*/,
  attr: /@[a-zA-Z_]\w*/,
  symbol: matchOneOf(symbolSet),
  digits: /\d+/,
  ws: /\s+/,
});

// deno-lint-ignore no-explicit-any
export interface TestParseResult<T, S = any> {
  parsed: OptParserResult<T>;
  position: number;
  stable: S;
}

/** utility for testing parsers */
// deno-lint-ignore no-explicit-any
export function testParse<T, C = any, S = any>(
  p: Parser<Stream<Token>, T>,
  src: string,
  tokenMatcher: RegexMatchers<string> = testMatcher,
  appState: AppState<C, S> = { context: {} as C, stable: [] as S },
): TestParseResult<T, S> {
  const stream = new FilterStream(
    new MatchersStream(src, tokenMatcher),
    (t) => t.kind !== "ws",
  );
  const parsed = p.parse({ stream, appState });
  return { parsed, position: stream.checkpoint(), stable: appState.stable };
}

// deno-lint-ignore no-explicit-any
export function testParseWithStream<T, C = any, S = any>(
  p: Parser<Stream<Token>, T>,
  stream: Stream<Token>,
  appState: AppState<C, S> = { context: {} as C, stable: [] as S },
): TestParseResult<T, S> {
  const parsed = p.parse({ stream, appState: appState });
  return { parsed, position: stream.checkpoint(), stable: appState.stable };
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

export async function expectNoLogAsync<T>(fn: () => Promise<T>): Promise<T> {
  const { log, logged } = logCatch();
  const result = await withLoggerAsync(log, fn);
  if (logged()) {
    console.log(logged());
  }
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
