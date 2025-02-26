import { expect, test } from "vitest";
import { astToString } from "../debug/ASTtoString.ts";
import { parseTest } from "./TestUtil.ts";

test("@if(false) enable f16", () => {
  const src = `
    @if(false) enable f16;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      attribute @if(false)
      directive enable f16 @if
      text '
      '"
  `);
});

test("@if(false) const_assert true;", () => {
  const src = `
    @if(false) const_assert true;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      assert
        attribute @if(false)
        text ' const_assert true;'
      text '
      '"
  `);
});

test("@if(true) var x = 7", () => {
  const src = `
    @if(true) var x = 7; 
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      gvar %x @if
        attribute @if(true)
        text ' var '
        typeDecl %x
          decl %x
        text ' = 7;'
      text ' 
      '"
  `);
});

test("conditional statement", () => {
  const src = `
    fn main() {
      var x = 1;
      @if(true) x = 2 ;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem); //?
  // expect(astString).toMatchInlineSnapshot('tbd');
});

// test("", () => {
//   const src = `
//   `;
//   const ast = parseTest(src);
//   const astString = astToString(ast.moduleElem);
//   expect(astString).toMatchInlineSnapshot('tbd');
// });
