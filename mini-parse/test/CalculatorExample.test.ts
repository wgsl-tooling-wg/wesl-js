import { testParse } from "../test-util/index.ts";
import { expect, test } from "vitest";
import { calcMatcher, statement } from "../examples/CalculatorExample.ts";
import {
  simpleSum,
  simpleTokens,
  sumResults,
  taggedSum,
} from "../examples/DocExamples.ts";
import type { Stream, Token } from "../Stream.ts";
import { FilterStream } from "../stream/FilterStream.ts";
import {
  MatchersStream,
  type RegexMatchers,
} from "../stream/MatchersStream.ts";

test("parse 3 + 4", () => {
  const src = "3 + 4";
  const parsed = testParse(statement, src, calcMatcher);
  expect(parsed.position).toBe(src.length);
});

test("parse 3 + 4 + 7", () => {
  const src = "3 + 4 + 7";
  const parsed = testParse(statement, src, calcMatcher);
  expect(parsed.position).toBe(src.length);
});

test("simple sum", () => {
  const stream = matchingStream("4 + 8", simpleTokens);
  const results = simpleSum.parse({ stream });
  expect(results?.value).toEqual(["4", "+", "8"]);
});

test("simple sum results ", () => {
  const stream = matchingStream("3 + 12", simpleTokens);
  const results = sumResults.parse({ stream });
  expect(results?.value).toBe(15);
});

test("tagged sum results ", () => {
  const stream = matchingStream("1 + 2 + 9", simpleTokens);
  const results = taggedSum.parse({ stream });
  expect(results?.value).toBe(12);
});

function matchingStream(
  src: string,
  rootMatcher: RegexMatchers<string>,
): Stream<Token> {
  const innerStream = new MatchersStream(src, rootMatcher);
  return new FilterStream(innerStream, (t) => t.kind !== "ws");
}
