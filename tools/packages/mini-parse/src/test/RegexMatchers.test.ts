import { expect, test } from "vitest";
import { RegexMatchers } from "../stream/MatchersStream.ts";

test("token matcher", () => {
  const m = new RegexMatchers({
    name: /[a-z]+/,
    spaces: /\s+/,
    number: /\d+/,
  });
  const src = "27 foo";
  expect(m.execAt(src, 0)).toEqual({
    kind: "number",
    text: "27",
    span: [0, 2],
  });
  expect(m.execAt(src, 2)).toEqual({ kind: "spaces", text: " ", span: [2, 3] });
  expect(m.execAt(src, 3)).toEqual({ kind: "name", text: "foo", span: [3, 6] });
});
