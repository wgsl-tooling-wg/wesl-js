import { testParse } from "../test-util/index.ts";
import { expect } from "@std/expect";
import { calcMatcher } from "../examples/CalculatorExample.ts";
import {
  power,
  product,
  resultsStatement,
  sum,
} from "../examples/CalculatorResultsExample.ts";
import type { Parser } from "../Parser.ts";
import type { Stream, Token } from "../Stream.ts";

Deno.test("power 2 ^ 4", () => {
  const { parsed } = testParse(power, "2 ^ 3", calcMatcher);
  expect(parsed?.value).toBe(8);
});

Deno.test("product 3 * 4 ", () => {
  const { parsed } = testParse(product, "3 * 4", calcMatcher);
  expect(parsed?.value).toBe(12);
});

Deno.test("sum 3 + 4 ", () => {
  const { parsed } = testParse(sum, "3 + 4", calcMatcher);
  expect(parsed?.value).toBe(7);
});

Deno.test("parse 3 + 4 * 8", () => {
  const result = calcTest(resultsStatement, "3 + 4 * 8");
  expect(result).toBe(35);
});

Deno.test("parse 3 * 4 + 8", () => {
  const result = calcTest(resultsStatement, "3 * 4 + 8");
  expect(result).toBe(20);
});

Deno.test("parse 3^2 * 4 + 11", () => {
  const result = calcTest(resultsStatement, "3^2 *4 + 11");
  expect(result).toBe(47);
});

Deno.test("parse 2^4^2", () => {
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
