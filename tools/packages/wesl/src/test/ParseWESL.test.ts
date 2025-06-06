import { expect, test } from "vitest";
import { astToString } from "../debug/ASTtoString.ts";
import { importToString } from "../debug/ImportToString.ts";
import { parseTest, parseTestRaw } from "./TestUtil.ts";

test("parse empty string", () => {
  const ast = parseTest("");
  expect(astToString(ast.moduleElem)).toMatchInlineSnapshot(`"module"`);
});

test("parse fn foo() { }", () => {
  const src = "fn foo() { }";
  const ast = parseTest(src);
  expect(astToString(ast.moduleElem)).toMatchInlineSnapshot(`
    "module
      fn foo()
        decl %foo
        statement
          text '{ }'"
  `);
});

test("parse fn with calls", () => {
  const src = "fn foo() { foo(); bar(); }";
  const ast = parseTest(src);
  expect(astToString(ast.moduleElem)).toMatchInlineSnapshot(`
    "module
      fn foo()
        decl %foo
        statement
          text '{ '
          ref foo
          text '(); '
          ref bar
          text '(); }'"
  `);
});

test("parse unicode ident", () => {
  // List taken straight from the examples at https://www.w3.org/TR/WGSL/#identifiers
  const src = `
  fn Δέλτα(){} 
  fn réflexion(){} 
  fn Кызыл(){} 
  fn 𐰓𐰏𐰇(){} 
  fn 朝焼け(){}
  fn سلام(){} 
  fn 검정(){} 
  fn שָׁלוֹם(){}
  fn गुलाबी(){}
  fn փիրուզ(){}
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchSnapshot();
});

test("parse global var", () => {
  const src = `var x: i32 = 1;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      gvar %x : i32
        text 'var '
        typeDecl %x : i32
          decl %x
          text ': '
          type i32
            ref i32
        text ' = 1;'"
  `);
});

test("parse alias", () => {
  const src = `alias Num = i32;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      alias %Num=i32
        text 'alias '
        decl %Num
        text ' = '
        type i32
          ref i32
        text ';'"
  `);
});

test("parse const", () => {
  const src = `const y = 11u;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      const %y
        text 'const '
        typeDecl %y
          decl %y
        text ' = 11u;'"
  `);
});

test("parse override ", () => {
  const src = `override z: f32;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      override %z : f32
        text 'override '
        typeDecl %z : f32
          decl %z
          text ': '
          type f32
            ref f32
        text ';'"
  `);
});

test("parse const_assert", () => {
  const src = `const_assert x < y;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      assert
        text 'const_assert '
        ref x
        text ' < '
        ref y
        text ';'"
  `);
});

test("parse struct", () => {
  const src = `struct foo { bar: i32, zip: u32, } ;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      struct foo
        text 'struct '
        decl %foo
        text ' { '
        member bar: i32
          name bar
          text ': '
          type i32
            ref i32
        text ', '
        member zip: u32
          name zip
          text ': '
          type u32
            ref u32
        text ', }'
      text ' ;'"
  `);
});

test("parse global diagnostic", () => {
  const src = `
    diagnostic(off,derivative_uniformity);

    fn main() {}
    `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      directive diagnostic(off, derivative_uniformity)
      text '

        '
      fn main()
        decl %main
        statement
          text '{}'
      text '
        '"
  `);
});

test("parse @attribute before fn", () => {
  const src = `@compute fn main() {} `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn main() @compute
        attribute @compute
        decl %main
        statement
          text '{}'
      text ' '"
  `);
});

test("parse @compute @workgroup_size(a, b, 1) before fn", () => {
  const src = `
    @compute 
    @workgroup_size(a, b, 1) 
    fn main() {}
    `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn main() @compute @workgroup_size
        attribute @compute
        attribute @workgroup_size(ref a, ref b, '1')
          expression ref a
            ref a
          expression ref b
            ref b
          expression '1'
            text '1'
        decl %main
        statement
          text '{}'
      text '
        '"
  `);
});

test("parse top level var", () => {
  const src = `
    @group(0) @binding(0) var<uniform> u: Uniforms;      

    fn main() {}
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      gvar %u : Uniforms @group @binding
        attribute @group('0')
          expression '0'
            text '0'
        text ' '
        attribute @binding('0')
          expression '0'
            text '0'
        text ' var<uniform> '
        typeDecl %u : Uniforms
          decl %u
          text ': '
          type Uniforms
            ref Uniforms
        text ';'
      text '      

        '
      fn main()
        decl %main
        statement
          text '{}'
      text '
      '"
  `);
});

test("parse top level override and const", () => {
  const src = `
    override x = 21;
    const y = 1;

    fn main() {}
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      override %x
        text 'override '
        typeDecl %x
          decl %x
        text ' = 21;'
      text '
        '
      const %y
        text 'const '
        typeDecl %y
          decl %y
        text ' = 1;'
      text '

        '
      fn main()
        decl %main
        statement
          text '{}'
      text '
      '"
  `);
});

test("parse root level ;;", () => {
  const src = ";;";
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text ';;'"
  `);
});

test("parse simple alias", () => {
  const src = `alias NewType = OldType;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      alias %NewType=OldType
        text 'alias '
        decl %NewType
        text ' = '
        type OldType
          ref OldType
        text ';'"
  `);
});

test("parse array alias", () => {
  const src = `
    alias Points3 = array<Point, 3>;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      alias %Points3=array<Point, '3'>
        text 'alias '
        decl %Points3
        text ' = '
        type array<Point, '3'>
          ref array
          text '<'
          type Point
            ref Point
          text ', '
          expression '3'
            text '3'
          text '>'
        text ';'
      text '
      '"
  `);
});

test("fnDecl parses fn with return type", () => {
  const src = `fn foo() -> MyType { }`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn foo() -> MyType
        decl %foo
        type MyType
          ref MyType
        statement
          text '{ }'"
  `);
});

test("fnDecl parses :type specifier in fn args", () => {
  const src = `
    fn foo(a: MyType) { }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn foo(a: MyType)
        decl %foo
        param
          decl %a
          typeDecl %a : MyType
            text ': '
            type MyType
              ref MyType
        statement
          text '{ }'
      text '
      '"
  `);
});

test("fnDecl parses :type specifier in fn block", () => {
  const src = `
    fn foo() { 
      var b:MyType;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn foo()
        decl %foo
        statement
          text '{ 
          '
          var %b : MyType
            text 'var '
            typeDecl %b : MyType
              decl %b
              text ':'
              type MyType
                ref MyType
          text ';
        }'
      text '
      '"
  `);
});

test("parse type in <template> in fn args", () => {
  const src = `
    fn foo(a: vec2<MyStruct>) { };`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn foo(a: vec2<MyStruct>)
        decl %foo
        param
          decl %a
          typeDecl %a : vec2<MyStruct>
            text ': '
            type vec2<MyStruct>
              ref vec2
              text '<'
              type MyStruct
                ref MyStruct
              text '>'
        statement
          text '{ }'
      text ';'"
  `);
});

test("parse simple templated type", () => {
  const src = `fn main(a: array<MyStruct,4>) { }`;

  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn main(a: array<MyStruct, '4'>)
        decl %main
        param
          decl %a
          typeDecl %a : array<MyStruct, '4'>
            text ': '
            type array<MyStruct, '4'>
              ref array
              text '<'
              type MyStruct
                ref MyStruct
              text ','
              expression '4'
                text '4'
              text '>'
        statement
          text '{ }'"
  `);
});

test("parse with space before template", () => {
  const src = `fn main(a: array <MyStruct,4>) { }`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn main(a: array<MyStruct, '4'>)
        decl %main
        param
          decl %a
          typeDecl %a : array<MyStruct, '4'>
            text ': '
            type array<MyStruct, '4'>
              ref array
              text ' <'
              type MyStruct
                ref MyStruct
              text ','
              expression '4'
                text '4'
              text '>'
        statement
          text '{ }'"
  `);
});

test("parse nested template that ends with >> ", () => {
  const src = `fn main(a: vec2<array <MyStruct,4>>) { }`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn main(a: vec2<array<MyStruct, '4'>>)
        decl %main
        param
          decl %a
          typeDecl %a : vec2<array<MyStruct, '4'>>
            text ': '
            type vec2<array<MyStruct, '4'>>
              ref vec2
              text '<'
              type array<MyStruct, '4'>
                ref array
                text ' <'
                type MyStruct
                  ref MyStruct
                text ','
                expression '4'
                  text '4'
                text '>'
              text '>'
        statement
          text '{ }'"
  `);
});

test("parse type in <template> in global var", () => {
  const src = `var<private> x:array<MyStruct, 8>;`;

  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      gvar %x : array<MyStruct, '8'>
        text 'var<private> '
        typeDecl %x : array<MyStruct, '8'>
          decl %x
          text ':'
          type array<MyStruct, '8'>
            ref array
            text '<'
            type MyStruct
              ref MyStruct
            text ', '
            expression '8'
              text '8'
            text '>'
        text ';'"
  `);
});

test("parse for(;;) {} not as a fn call", () => {
  const src = `
    fn main() {
      for (var a = 1; a < 10; a++) {}
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
          for ('
          var %a
            text 'var '
            typeDecl %a
              decl %a
            text ' = 1'
          text '; '
          ref a
          text ' < 10; '
          ref a
          text '++) '
          statement
            text '{}'
          text '
        }'
      text '
      '"
  `);
});

test("eolf followed by blank line", () => {
  const src = `
    fn foo() { }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn foo()
        decl %foo
        statement
          text '{ }'
      text '
      '"
  `);
});

test("parse fn with attributes and suffix comma", () => {
  const src = `
  @compute
  @workgroup_size(workgroupThreads, 1, 1) 
  fn main(
      @builtin(global_invocation_id) grid: vec3<u32>,
      @builtin(local_invocation_index) localIndex: u32,  
  ) { }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
      '
      fn main(grid: vec3<u32>, localIndex: u32) @compute @workgroup_size
        attribute @compute
        attribute @workgroup_size(ref workgroupThreads, '1', '1')
          expression ref workgroupThreads
            ref workgroupThreads
          expression '1'
            text '1'
          expression '1'
            text '1'
        decl %main
        param
          attribute @builtin(global_invocation_id)
          text ' '
          decl %grid
          typeDecl %grid : vec3<u32>
            text ': '
            type vec3<u32>
              ref vec3
              text '<'
              type u32
                ref u32
              text '>'
        param
          attribute @builtin(local_invocation_index)
          text ' '
          decl %localIndex
          typeDecl %localIndex : u32
            text ': '
            type u32
              ref u32
        statement
          text '{ }'
      text '
      '"
  `);
});

test("parse fn", () => {
  const src = `fn foo(x: i32, y: u32) -> f32 { return 1.0; }`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn foo(x: i32, y: u32) -> f32
        decl %foo
        param
          decl %x
          typeDecl %x : i32
            text ': '
            type i32
              ref i32
        param
          decl %y
          typeDecl %y : u32
            text ': '
            type u32
              ref u32
        type f32
          ref f32
        statement
          text '{ return 1.0; }'"
  `);
});

test("parse @attribute before fn", () => {
  const src = `@compute fn main() {} `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn main() @compute
        attribute @compute
        decl %main
        statement
          text '{}'
      text ' '"
  `);
});

test("import package::foo::bar;", ctx => {
  const src = ctx.task.name;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      import package::foo::bar;"
  `);
});

test("parse foo::bar(); ", () => {
  const src = "fn main() { foo::bar(); }";
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn main()
        decl %main
        statement
          text '{ '
          ref foo::bar
          text '(); }'"
  `);
});

test("parse let x: foo::bar; ", () => {
  const src = "fn main() { let x: foo::bar = 1; }";
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn main()
        decl %main
        statement
          text '{ let '
          typeDecl %x : foo::bar
            decl %x
            text ': '
            type foo::bar
              ref foo::bar
          text ' = 1; }'"
  `);
});

test("parse var x: foo::bar;", () => {
  const src = `
     var<private> x: foo::bar;
     fn main() { }
  `;

  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
         '
      gvar %x : foo::bar
        text 'var<private> '
        typeDecl %x : foo::bar
          decl %x
          text ': '
          type foo::bar
            ref foo::bar
        text ';'
      text '
         '
      fn main()
        decl %main
        statement
          text '{ }'
      text '
      '"
  `);
});

test("parse switch statement", () => {
  const src = `
    fn main(x: i32) {
      switch (x) {
        case 1: { break; }
        default: { break; }
      }
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn main(x: i32)
        decl %main
        param
          decl %x
          typeDecl %x : i32
            text ': '
            type i32
              ref i32
        statement
          text '{
          switch ('
          ref x
          text ') {
            '
          switch-clause
            text 'case 1: '
            statement
              text '{ break; }'
          text '
            '
          switch-clause
            text 'default: '
            statement
              text '{ break; }'
          text '
          }
        }'
      text '
      '"
  `);
});

test("parse switch statement-2", () => {
  const src = `

    fn main(x: u32) {
      switch ( code ) {
        case 5u: { if 1 > 0 { } }
        default: { break; }
      }
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '

        '
      fn main(x: u32)
        decl %main
        param
          decl %x
          typeDecl %x : u32
            text ': '
            type u32
              ref u32
        statement
          text '{
          switch ( '
          ref code
          text ' ) {
            '
          switch-clause
            text 'case 5u: '
            statement
              text '{ if 1 > 0 '
              statement
                text '{ }'
              text ' }'
          text '
            '
          switch-clause
            text 'default: '
            statement
              text '{ break; }'
          text '
          }
        }'
      text '
      '"
  `);
});

test("parse struct constructor in assignment", () => {
  const src = `
    fn main() {
      var x = AStruct(1u);
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
            text ' = '
            ref AStruct
            text '(1u)'
          text ';
        }'
      text '
       '"
  `);
});

test("parse struct.member (component_or_swizzle)", () => {
  const src = `
    fn main() {
        let x = u.frame;
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
            let '
          typeDecl %x
            decl %x
          text ' = '
          memberRef u.frame
            ref u
            text '.'
            name frame
          text ';
        }'
      text '
      '"
  `);
});

test("var<workgroup> work: array<u32, 128>;", ctx => {
  const ast = parseTest(ctx.task.name);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      gvar %work : array<u32, '128'>
        text 'var<workgroup> '
        typeDecl %work : array<u32, '128'>
          decl %work
          text ': '
          type array<u32, '128'>
            ref array
            text '<'
            type u32
              ref u32
            text ', '
            expression '128'
              text '128'
            text '>'
        text ';'"
  `);
});

test("fn f() { _ = 1; }", ctx => {
  const ast = parseTest(ctx.task.name);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn f()
        decl %f
        statement
          text '{ _ = 1; }'"
  `);
});

test("var foo: vec2<f32 >= vec2( 0.5, -0.5);", ctx => {
  const ast = parseTest(ctx.task.name);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      gvar %foo : vec2<f32>
        text 'var '
        typeDecl %foo : vec2<f32>
          decl %foo
          text ': '
          type vec2<f32>
            ref vec2
            text '<'
            type f32
              ref f32
            text ' >'
        text '= '
        ref vec2
        text '( 0.5, -0.5);'"
  `);
});

test("fn main() { var tmp: array<i32, 1 << 1>=array(1, 2); }", ctx => {
  const ast = parseTest(ctx.task.name);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      fn main()
        decl %main
        statement
          text '{ '
          var %tmp : array<i32, '1 << 1'>
            text 'var '
            typeDecl %tmp : array<i32, '1 << 1'>
              decl %tmp
              text ': '
              type array<i32, '1 << 1'>
                ref array
                text '<'
                type i32
                  ref i32
                text ', '
                expression '1 << 1'
                  text '1 << 1'
                text '>'
            text '='
            ref array
            text '(1, 2)'
          text '; }'"
  `);
});

test("import a::b::c;", ctx => {
  const ast = parseTest(ctx.task.name);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      import a::b::c;"
  `);
});

test("import package::file1::{foo, bar};", ctx => {
  const src = ctx.task.name;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      import package::file1::{foo, bar};"
  `);
});

test("import package::file1::{foo, bar};", ctx => {
  const src = ctx.task.name;
  const ast = parseTest(src);
  const imps = ast.imports.map(t => importToString(t)).join("\n");

  expect(imps).toMatchInlineSnapshot(`"package::file1::{foo, bar};"`);
});

test("import foo_bar::boo;", ctx => {
  const ast = parseTest(ctx.task.name);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      import foo_bar::boo;"
  `);
});

test(`import a::{ b };`, ctx => {
  const ast = parseTest(ctx.task.name);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      import a::{b};"
  `);
});

test(`import a::{ b, c::{d, e}, f };`, ctx => {
  const src = ctx.task.name;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);

  expect(astString).toMatchInlineSnapshot(`
    "module
      import a::{b, c::{d, e}, f};"
  `);
});

test(`parse ptr`, () => {
  const src = `
    var particles: ptr<storage, f32, read_write>;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      gvar %particles : ptr<storage, f32, read_write>
        text 'var '
        typeDecl %particles : ptr<storage, f32, read_write>
          decl %particles
          text ': '
          type ptr<storage, f32, read_write>
            ref ptr
            text '<'
            type storage
              ref storage
            text ', '
            type f32
              ref f32
            text ', '
            type read_write
              ref read_write
            text '>'
        text ';'
      text '
      '"
  `);
});

test(`parse ptr with internal array`, () => {
  const src = `
    var particles: ptr<storage, array<f32>, read_write>;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      gvar %particles : ptr<storage, array<f32>, read_write>
        text 'var '
        typeDecl %particles : ptr<storage, array<f32>, read_write>
          decl %particles
          text ': '
          type ptr<storage, array<f32>, read_write>
            ref ptr
            text '<'
            type storage
              ref storage
            text ', '
            type array<f32>
              ref array
              text '<'
              type f32
                ref f32
              text '>'
            text ', '
            type read_write
              ref read_write
            text '>'
        text ';'
      text '
      '"
  `);
});

test(`parse binding struct`, () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      struct Bindings
        text 'struct '
        decl %Bindings
        text ' {
          '
        member @group @binding particles: ptr<storage, array<f32>, read_write>
          attribute @group('0')
            expression '0'
              text '0'
          text ' '
          attribute @binding('0')
            expression '0'
              text '0'
          text ' '
          name particles
          text ': '
          type ptr<storage, array<f32>, read_write>
            ref ptr
            text '<'
            type storage
              ref storage
            text ', '
            type array<f32>
              ref array
              text '<'
              type f32
                ref f32
              text '>'
            text ', '
            type read_write
              ref read_write
            text '>'
        text ', 
        }'
      text '
      '"
  `);
});

test(`parse struct reference`, () => {
  const src = `
    fn f() { let x = a.b[0]; };
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn f()
        decl %f
        statement
          text '{ let '
          typeDecl %x
            decl %x
          text ' = '
          memberRef a.b[0]
            ref a
            text '.'
            name b
            stuff
              text '[0]'
          text '; }'
      text ';
      '"
  `);
});

test("member reference with extra components", () => {
  const src = `
  fn foo() {
    output[ out + 0u ] = c.p0.t0.x;
  }
 `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
      '
      fn foo()
        decl %foo
        statement
          text '{
        '
          ref output
          text '[ '
          ref out
          text ' + 0u ] = '
          memberRef c.p0.t0.x
            ref c
            text '.'
            name p0
            stuff
              text '.t0.x'
          text ';
      }'
      text '
     '"
  `);
});

test("parse let declaration", () => {
  const src = `
    fn vertexMain() {
      let char = array<u32, 2>(0, 0);
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn vertexMain()
        decl %vertexMain
        statement
          text '{
          let '
          typeDecl %char
            decl %char
          text ' = '
          ref array
          text '<'
          type u32
            ref u32
          text ', '
          expression '2'
            text '2'
          text '>(0, 0);
        }'
      text '
      '"
  `);
});

test("parse let declaration with type", () => {
  const src = `
    fn vertexMain() {
      let char : u32 = 0;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn vertexMain()
        decl %vertexMain
        statement
          text '{
          let '
          typeDecl %char : u32
            decl %char
            text ' : '
            type u32
              ref u32
          text ' = 0;
        }'
      text '
      '"
  `);
});

test("separator in let assignment", () => {
  const src = `
    fn vertexMain() {
      let a = b::c;
    }
  `;
  const ast = parseTestRaw(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn vertexMain()
        decl %vertexMain
        statement
          text '{
          let '
          typeDecl %a
            decl %a
          text ' = '
          ref b::c
          text ';
        }'
      text '
      '"
  `);
});

test("separator in fn call ", () => {
  const src = `
    fn vertexMain() {
      b::c();
    }
  `;
  const ast = parseTestRaw(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn vertexMain()
        decl %vertexMain
        statement
          text '{
          '
          ref b::c
          text '();
        }'
      text '
      '"
  `);
});

test("binding struct", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
      @group(0) @binding(1) uniforms: ptr<uniform, Uniforms>, 
      @group(0) @binding(2) tex: texture_2d<rgba8unorm>,
      @group(0) @binding(3) samp: sampler,
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
        '
      struct Bindings
        text 'struct '
        decl %Bindings
        text ' {
          '
        member @group @binding particles: ptr<storage, array<f32>, read_write>
          attribute @group('0')
            expression '0'
              text '0'
          text ' '
          attribute @binding('0')
            expression '0'
              text '0'
          text ' '
          name particles
          text ': '
          type ptr<storage, array<f32>, read_write>
            ref ptr
            text '<'
            type storage
              ref storage
            text ', '
            type array<f32>
              ref array
              text '<'
              type f32
                ref f32
              text '>'
            text ', '
            type read_write
              ref read_write
            text '>'
        text ', 
          '
        member @group @binding uniforms: ptr<uniform, Uniforms>
          attribute @group('0')
            expression '0'
              text '0'
          text ' '
          attribute @binding('1')
            expression '1'
              text '1'
          text ' '
          name uniforms
          text ': '
          type ptr<uniform, Uniforms>
            ref ptr
            text '<'
            type uniform
              ref uniform
            text ', '
            type Uniforms
              ref Uniforms
            text '>'
        text ', 
          '
        member @group @binding tex: texture_2d<rgba8unorm>
          attribute @group('0')
            expression '0'
              text '0'
          text ' '
          attribute @binding('2')
            expression '2'
              text '2'
          text ' '
          name tex
          text ': '
          type texture_2d<rgba8unorm>
            ref texture_2d
            text '<'
            type rgba8unorm
              ref rgba8unorm
            text '>'
        text ',
          '
        member @group @binding samp: sampler
          attribute @group('0')
            expression '0'
              text '0'
          text ' '
          attribute @binding('3')
            expression '3'
              text '3'
          text ' '
          name samp
          text ': '
          type sampler
            ref sampler
        text ',
        }'
      text '
      '"
  `);
});

test("memberRefs with extra components", () => {
  const src = `
    fn main() {
      b.particles[0] = b.uniforms.foo;
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
          memberRef b.particles[0]
            ref b
            text '.'
            name particles
            stuff
              text '[0]'
          text ' = '
          memberRef b.uniforms.foo
            ref b
            text '.'
            name uniforms
            stuff
              text '.foo'
          text ';
        }'
      text '
      '"
  `);
});

test("memberRef with ref in array", () => {
  const src = `
    fn main() {
      vsOut.barycenticCoord[vertNdx] = 1.0;
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
          memberRef vsOut.barycenticCoord[ vertNdx ]
            ref vsOut
            text '.'
            name barycenticCoord
            stuff
              text '['
              ref vertNdx
              text ']'
          text ' = 1.0;
        }'
      text '
      '"
  `);
});

test("parse inline package reference", () => {
  const src = `
    fn main() {
      package::foo::bar();
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
          ref package::foo::bar
          text '();
        }'
      text '
      '"
  `);
});

test("parse @location", () => {
  const src = `
      @fragment
      fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f { 
        return pos;
      }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  expect(astString).toMatchInlineSnapshot(`
    "module
      text '
          '
      fn fragmentMain(pos: vec4f) @fragment -> vec4f
        attribute @fragment
        decl %fragmentMain
        param
          attribute @builtin(position)
          text ' '
          decl %pos
          typeDecl %pos : vec4f
            text ': '
            type vec4f
              ref vec4f
        attribute @location('0')
          expression '0'
            text '0'
        type vec4f
          ref vec4f
        statement @location
          text '{ 
            return '
          ref pos
          text ';
          }'
      text '
      '"
  `);
});

test("parse foo::else()", () => {
  const src = `
    fn main() {
      foo::else();
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
          ref foo::else
          text '();
        }'
      text '
      '"
  `);
});
