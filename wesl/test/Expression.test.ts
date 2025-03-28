import { eof, seq } from "@wesl/mini-parse";
import { expect } from "@std/expect";
import { expression } from "../parse/WeslExpression.ts";
import { testAppParse } from "./TestUtil.ts";

Deno.test("parse number", () => {
  const src = `3`;
  const { parsed } = testAppParse(seq(expression, eof), src);
  expect(parsed).not.toBeNull();
});

Deno.test("parse comparisons with && ||", () => {
  const src = `a<3   &&   4>(5)`;
  const { parsed } = testAppParse(seq(expression, eof), src);
  expect(parsed).not.toBeNull();
});

Deno.test("parse vec templated type", () => {
  const src = `vec2<f32>`;
  const { parsed } = testAppParse(seq(expression, eof), src);
  expect(parsed).not.toBeNull();
});
