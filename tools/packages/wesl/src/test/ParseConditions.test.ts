import { expect, test } from "vitest";
import { astToString } from "../debug/ASTtoString.ts";
import { parseTest } from "./TestUtil.ts";

test("parse complex condition", () => {
  const ast = parseTest("@if(true || (!foo&&!!false) )\nfn a() {}");
  expect(astToString(ast.moduleElem)).toMatchInlineSnapshot(`
    "module
      fn a() @if
        attribute @if(true || (!foo && !!false))
        decl %a
        statement
          text '{}'"
  `);
});

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
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn main()
        decl %main
        statement
          text '{
          '
          var %x
            text 'var '
            typeDecl %x
              decl %x
            text ' = 1'
          text ';
          '
          statement @if
            attribute @if(true)
            text ' '
            ref x
            text ' = 2 ;'
          text '
        }'
      text '
      '"
  `);
});

test("compound statement", () => {
  const src = `
    fn main() {
      @if(false) {
        let x = 1;
      }
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn main()
        decl %main
        statement
          text '{
          '
          statement @if
            attribute @if(false)
            text ' {
            '
            let %x
              text 'let '
              typeDecl %x
                decl %x
              text ' = 1'
            text ';
          }'
          text '
        }'
      text '
      '"
  `);
});

test("conditional local var", () => {
  const src = `
    fn main() {
      @if(true) var x = 1;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn main()
        decl %main
        statement
          text '{
          '
          statement @if
            attribute @if(true)
            text ' '
            var %x
              text 'var '
              typeDecl %x
                decl %x
              text ' = 1'
            text ';'
          text '
        }'
      text '
      '"
  `);
});

// test("", () => {
//   const src = `
//   `;
//   const ast = parseTest(src);
//   const astString = astToString(ast.moduleElem);
//   expect(astString).toMatchInlineSnapshot('tbd');
// });
