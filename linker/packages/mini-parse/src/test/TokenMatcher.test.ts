import { expect, test } from "vitest";
import { tokenMatcher } from "../TokenMatcher.js";

test("token matcher", () => {
  const m = tokenMatcher({
    name: /[a-z]+/,
    spaces: /\s+/,
    number: /\d+/,
  });
  m.start("27 foo");
  const [a, b, c] = [1, 2, 3].map(m.next);
  expect(a).toEqual({ kind: "number", text: "27", span: [0, 2] });
  expect(b).toEqual({ kind: "spaces", text: " ", span: [2, 3] });
  expect(c).toEqual({ kind: "name", text: "foo", span: [3, 6] });
});

test("token matcher fields", () => {
  const m = tokenMatcher({
    name: /[a-z]+/,
    spaces: /\s+/,
  });
  expect(m.name).toEqual("name");
  expect(m.spaces).toEqual("spaces");
});
