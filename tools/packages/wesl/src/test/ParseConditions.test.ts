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
            let '
            typeDecl %x
              decl %x
            text ' = 1;
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

test("@if(MOBILE) const x = 1", () => {
  const src = `
    @if(MOBILE) const x = 1;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      const %x @if
        attribute @if(MOBILE)
        text ' const '
        typeDecl %x
          decl %x
        text ' = 1;'
      text '
      '"
  `);
});

test("@else after @if", () => {
  const src = `
    @if(false) const x = 1;
    @else const x = 2;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      const %x @if
        attribute @if(false)
        text ' const '
        typeDecl %x
          decl %x
        text ' = 1;'
      text '
        '
      const %x @else
        attribute @else
        text ' const '
        typeDecl %x
          decl %x
        text ' = 2;'
      text '
      '"
  `);
});

test("@else with function", () => {
  const src = `
    @if(DEBUG) fn foo() { return 1; }
    @else fn foo() { return 2; }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn foo() @if
        attribute @if(DEBUG)
        decl %foo
        statement
          text '{ return 1; }'
      text '
        '
      fn foo() @else
        attribute @else
        decl %foo
        statement
          text '{ return 2; }'
      text '
      '"
  `);
});

test("@else with statement", () => {
  const src = `
    fn main() {
      @if(A) let x = 1.0;
      @else let x = 2.0;
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
            attribute @if(A)
            text ' let '
            typeDecl %x
              decl %x
            text ' = 1.0;'
          text '
          '
          statement @else
            attribute @else
            text ' let '
            typeDecl %x
              decl %x
            text ' = 2.0;'
          text '
        }'
      text '
      '"
  `);
});

test("@else compound statement", () => {
  const src = `
    fn test() {
      @if(MOBILE) { let a = 1; }
      @else { let a = 2; }
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn test()
        decl %test
        statement
          text '{
          '
          statement @if
            attribute @if(MOBILE)
            text ' { let '
            typeDecl %a
              decl %a
            text ' = 1; }'
          text '
          '
          statement @else
            attribute @else
            text ' { let '
            typeDecl %a
              decl %a
            text ' = 2; }'
          text '
        }'
      text '
      '"
  `);
});

test("@else with struct member", () => {
  const src = `
    struct Point {
      @if(DIMENSIONS_2) x: f32,
      @else x: vec3<f32>,
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      struct Point
        text 'struct '
        decl %Point
        text ' {
          '
        member @if x: f32
          attribute @if(DIMENSIONS_2)
          text ' '
          name x
          text ': '
          type f32
            ref f32
        text ',
          '
        member @else x: vec3<f32>
          attribute @else
          text ' '
          name x
          text ': '
          type vec3<f32>
            ref vec3
            text '<'
            type f32
              ref f32
            text '>'
        text ',
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
