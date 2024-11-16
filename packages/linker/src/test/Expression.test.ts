import { expect, test } from "vitest";
import { testAppParse } from "./TestUtil.ts";
import { expression } from "../ParseWgslD.ts";
import { eof, seq } from "mini-parse";
import { dlog } from "berry-pretty";

test("parse number", () => {
  const src = `3`;
  const { parsed } = testAppParse(seq(expression, eof), src);
  expect(parsed).not.toBeNull();
  expect(parsed!.tags.ident).toBeUndefined();
});

// TODO fixme
test.skip("parse comparisons with && ||", () => {
  const src = `array<3 && 4>(5)`;
  const { parsed } = testAppParse(seq(expression, eof), src);
  dlog({ parsed });
  expect(parsed!.tags.ident).toEqual(["array"]);
});
