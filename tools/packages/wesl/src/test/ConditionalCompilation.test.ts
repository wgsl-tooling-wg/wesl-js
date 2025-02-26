import { expect, test } from "vitest";
import { astToString } from "../debug/ASTtoString.ts";
import { parseTest } from "./TestUtil.ts";

test("parse complex condition", () => {
  const ast = parseTest("@if(true || (!foo&&!!false) )\nfn a() {}");
  expect(astToString(ast.moduleElem)).toMatchInlineSnapshot(`
    "module
      fn a() @if
        attribute @if(true || (!foo && !!false))
        text '
    fn '
        decl %a
        text '() {}'"
  `);
});
