import { type expect, test } from "vitest";
import { astToString } from "../debug/ASTtoString.ts";
import { importToString } from "../debug/ImportToString.ts";
import { parseTest, parseTestRaw } from "./TestUtil.ts";
import { assertSnapshot } from "@std/testing/snapshot";

test("parse empty string", async (t) => {
  const ast = parseTest("");
  await assertSnapshot(t, astToString(ast.moduleElem));
});

test("parse fn foo() { }", async (t) => {
  const src = "fn foo() { }";
  const ast = parseTest(src);
  await assertSnapshot(t, astToString(ast.moduleElem));
});

test("parse fn with calls", async (t) => {
  const src = "fn foo() { foo(); bar(); }";
  const ast = parseTest(src);
  await assertSnapshot(t, astToString(ast.moduleElem));
});

test("parse unicode ident", async (t) => {
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
  await assertSnapshot(t, astString);
});

test("parse global var", async (t) => {
  const src = `var x: i32 = 1;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse alias", async (t) => {
  const src = `alias Num = i32;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse const", async (t) => {
  const src = `const y = 11u;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse override ", async (t) => {
  const src = `override z: f32;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse const_assert", async (t) => {
  const src = `const_assert x < y;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse struct", async (t) => {
  const src = `struct foo { bar: i32, zip: u32, } ;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse global diagnostic", async (t) => {
  const src = `
    diagnostic(off,derivative_uniformity);

    fn main() {}
    `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse @attribute before fn", async (t) => {
  const src = `@compute fn main() {} `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse @compute @workgroup_size(a, b, 1) before fn", async (t) => {
  const src = `
    @compute 
    @workgroup_size(a, b, 1) 
    fn main() {}
    `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse top level var", async (t) => {
  const src = `
    @group(0) @binding(0) var<uniform> u: Uniforms;      

    fn main() {}
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse top level override and const", async (t) => {
  const src = `
    override x = 21;
    const y = 1;

    fn main() {}
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse root level ;;", async (t) => {
  const src = ";;";
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse simple alias", async (t) => {
  const src = `alias NewType = OldType;`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse array alias", async (t) => {
  const src = `
    alias Points3 = array<Point, 3>;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("fnDecl parses fn with return type", async (t) => {
  const src = `fn foo() -> MyType { }`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("fnDecl parses :type specifier in fn args", async (t) => {
  const src = `
    fn foo(a: MyType) { }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("fnDecl parses :type specifier in fn block", async (t) => {
  const src = `
    fn foo() { 
      var b:MyType;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse type in <template> in fn args", async (t) => {
  const src = `
    fn foo(a: vec2<MyStruct>) { };`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse simple templated type", async (t) => {
  const src = `fn main(a: array<MyStruct,4>) { }`;

  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse with space before template", async (t) => {
  const src = `fn main(a: array <MyStruct,4>) { }`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse nested template that ends with >> ", async (t) => {
  const src = `fn main(a: vec2<array <MyStruct,4>>) { }`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse type in <template> in global var", async (t) => {
  const src = `var<private> x:array<MyStruct, 8>;`;

  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse for(;;) {} not as a fn call", async (t) => {
  const src = `
    fn main() {
      for (var a = 1; a < 10; a++) {}
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("eolf followed by blank line", async (t) => {
  const src = `
    fn foo() { }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse fn with attributes and suffix comma", async (t) => {
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
  await assertSnapshot(t, astString);
});

test("parse fn", async (t) => {
  const src = `fn foo(x: i32, y: u32) -> f32 { return 1.0; }`;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse @attribute before fn", async (t) => {
  const src = `@compute fn main() {} `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("import package::foo::bar;", async (t) => {
  const src = t.name;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse foo::bar(); ", async (t) => {
  const src = "fn main() { foo::bar(); }";
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse let x: foo::bar; ", async (t) => {
  const src = "fn main() { let x: foo::bar = 1; }";
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse var x: foo::bar;", async (t) => {
  const src = `
     var<private> x: foo::bar;
     fn main() { }
  `;

  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse switch statement", async (t) => {
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
  await assertSnapshot(t, astString);
});

test("parse switch statement-2", async (t) => {
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
  await assertSnapshot(t, astString);
});

test("parse struct constructor in assignment", async (t) => {
  const src = `
    fn main() {
      var x = AStruct(1u);
    }
   `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse struct.member (component_or_swizzle)", async (t) => {
  const src = `
    fn main() {
        let x = u.frame;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("var<workgroup> work: array<u32, 128>;", async (t) => {
  const ast = parseTest(t.name);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("fn f() { _ = 1; }", async (t) => {
  const ast = parseTest(t.name);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("var foo: vec2<f32 >= vec2( 0.5, -0.5);", async (t) => {
  const ast = parseTest(t.name);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("fn main() { var tmp: array<i32, 1 << 1>=array(1, 2); }", async (t) => {
  const ast = parseTest(t.name);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("import a::b::c;", async (t) => {
  const ast = parseTest(t.name);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("import package::file1::{foo, bar};", async (t) => {
  const src = t.name;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("import package::file1::{foo, bar};", async (t) => {
  const src = t.name;
  const ast = parseTest(src);
  const imps = ast.imports.map((t) => importToString(t)).join("\n");

  await assertSnapshot(t, imps);
});

test("import foo_bar::boo;", async (t) => {
  const ast = parseTest(t.name);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test(`import a::{ b };`, async (t) => {
  const ast = parseTest(t.name);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test(`import a::{ b, c::{d, e}, f };`, async (t) => {
  const src = t.name;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);

  await assertSnapshot(t, astString);
});

test(`parse ptr`, async (t) => {
  const src = `
    var particles: ptr<storage, f32, read_write>;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test(`parse ptr with internal array`, async (t) => {
  const src = `
    var particles: ptr<storage, array<f32>, read_write>;
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test(`parse binding struct`, async (t) => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test(`parse struct reference`, async (t) => {
  const src = `
    fn f() { let x = a.b[0]; };
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("member reference with extra components", async (t) => {
  const src = `
  fn foo() {
    output[ out + 0u ] = c.p0.t0.x;
  }
 `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse let declaration", async (t) => {
  const src = `
    fn vertexMain() {
      let char = array<u32, 2>(0, 0);
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse let declaration with type", async (t) => {
  const src = `
    fn vertexMain() {
      let char : u32 = 0;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("separator in let assignment", async (t) => {
  const src = `
    fn vertexMain() {
      let a = b::c;
    }
  `;
  const ast = parseTestRaw(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("separator in fn call ", async (t) => {
  const src = `
    fn vertexMain() {
      b::c();
    }
  `;
  const ast = parseTestRaw(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("binding struct", async (t) => {
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
  await assertSnapshot(t, astString);
});

test("memberRefs with extra components", async (t) => {
  const src = `
    fn main() {
      b.particles[0] = b.uniforms.foo;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("memberRef with ref in array", async (t) => {
  const src = `
    fn main() {
      vsOut.barycenticCoord[vertNdx] = 1.0;
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse inline package reference", async (t) => {
  const src = `
    fn main() {
      package::foo::bar();
    }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});

test("parse @location", async (t) => {
  const src = `
      @fragment
      fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f { 
        return pos;
      }
  `;
  const ast = parseTest(src);
  const astString = astToString(ast.moduleElem);
  await assertSnapshot(t, astString);
});
