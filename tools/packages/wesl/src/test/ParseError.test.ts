import { expect, test } from "vitest";
import { errorHighlight } from "../Util.ts";
import { parseTest } from "./TestUtil.ts";

test("parse fn foo() { invalid }", () => {
  const src = "fn foo() { let }";
  expect(() => parseTest(src)).toThrowErrorMatchingInlineSnapshot(`
    [Error: ./test.wesl:1:15 error: invalid ident
    fn foo() { let }
                  ^]
  `);
});

test("parse invalid if", () => {
  const src = `fn foo() { 
  let a = 3;
  if(1<1) { 🐈‍⬛ } else {  }
  }`;
  expect(() => parseTest(src)).toThrowErrorMatchingInlineSnapshot(`
    [Error: ./test.wesl:3:15 error: Invalid token 🐈

      if(1<1) { 🐈‍⬛ } else {  }
                   ^]
  `);
});

test("error highlight", () => {
  expect(errorHighlight("foo", [0, 2]).join("\n")).toBe(`foo
^^`);
  expect(errorHighlight("foo", [0, 1]).join("\n")).toBe(`foo
^`);
  expect(errorHighlight("foo", [0, 0]).join("\n")).toBe(`foo
^`);
  expect(errorHighlight("foo", [1, 2]).join("\n")).toBe(`foo
 ^`);
});
