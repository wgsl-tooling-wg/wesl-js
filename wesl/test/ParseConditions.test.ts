import { astToString } from "../debug/ASTtoString.ts";
import { parseTest } from "./TestUtil.ts";
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("parse complex condition", async (t) => {
  const ast = parseTest("@if(true || (!foo&&!!false) )\nfn a() {}");
  await assertSnapshot(t, astToString(ast.moduleElem));
});

Deno.test("@if(false) enable f16", async (t) => {
  const src = `
    @if(false) enable f16;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

Deno.test("@if(false) const_assert true;", async (t) => {
  const src = `
    @if(false) const_assert true;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

Deno.test("@if(true) var x = 7", async (t) => {
  const src = `
    @if(true) var x = 7; 
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

Deno.test("conditional statement", async (t) => {
  const src = `
    fn main() {
      var x = 1;
      @if(true) x = 2 ;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

Deno.test("compound statement", async (t) => {
  const src = `
    fn main() {
      @if(false) {
        let x = 1;
      }
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

Deno.test("conditional local var", async (t) => {
  const src = `
    fn main() {
      @if(true) var x = 1;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

Deno.test("@if(MOBILE) const x = 1", async (t) => {
  const src = `
    @if(MOBILE) const x = 1;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

// Deno.test("", () => {
//   const src = `
//   `;
//   const ast = parseTest(src);
//   const astString = astToString(ast.moduleElem);
//   expect(astString).toMatchInlineSnapshot('tbd');
// });
