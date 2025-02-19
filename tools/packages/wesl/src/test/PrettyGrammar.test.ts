import { or, parserToString, seq } from "mini-parse";
import { expect, test } from "vitest";

test("print grammar", () => {
  const p: any = or("a", "b", () => p);
  const s = seq("a", "b", () => p);
  const result = parserToString(s);
  expect(result).toMatchInlineSnapshot(`
    "seq
      'a'
      'b'
      fn()
        or
          'a'
          'b'
          fn()
            ->or
    "
  `);
});
