import { testParse } from "mini-parse/test-util";
import { expect, test } from "vitest";
import type { Parser } from "../Parser.js";
import type { Stream, Token } from "../Stream.js";
import { calcMatcher } from "../examples/CalculatorExample.js";
import {
  power,
  product,
  resultsStatement,
  sum,
} from "../examples/CalculatorResultsExample.js";

test("power 2 ^ 4", () => {
  const { parsed } = testParse(power, "2 ^ 3", calcMatcher);
  expect(parsed?.value).toBe(8);
});

test("product 3 * 4 ", () => {
  const { parsed } = testParse(product, "3 * 4", calcMatcher);
  expect(parsed?.value).toBe(12);
});

test("sum 3 + 4 ", () => {
  const { parsed } = testParse(sum, "3 + 4", calcMatcher);
  expect(parsed?.value).toBe(7);
});

test("parse 3 + 4 * 8", () => {
  const result = calcTest(resultsStatement, "3 + 4 * 8");
  expect(result).toBe(35);
});

test("parse 3 * 4 + 8", () => {
  const result = calcTest(resultsStatement, "3 * 4 + 8");
  expect(result).toBe(20);
});

test("parse 3^2 * 4 + 11", () => {
  const result = calcTest(resultsStatement, "3^2 *4 + 11");
  expect(result).toBe(47);
});

test("parse 2^4^2", () => {
  const result = calcTest(resultsStatement, "2^4^2");
  expect(result).toBe(2 ** (4 ** 2));
});

function calcTest(
  parser: Parser<Stream<Token>, number>,
  src: string,
): number | undefined {
  const { parsed } = testParse(parser, src, calcMatcher);
  return parsed?.value;
}
