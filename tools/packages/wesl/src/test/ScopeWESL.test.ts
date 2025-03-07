import { expect, test } from "vitest";
import { scopeToString } from "../debug/ScopeToString.ts";
import { parseWESL, WeslAST } from "../ParseWESL.ts";
import { DeclIdent, resetScopeIds } from "../Scope.ts";

function testParseWESL(src: string): WeslAST {
  resetScopeIds();
  return parseWESL(src);
}

test("scope from simple fn", () => {
  const src = `
    fn main() {
      var x: i32 = 1;
    }
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %main 
      { %x i32 } #1
    } #0"
  `);
});

test("scope from fn with reference", () => {
  const src = `
    fn main() {
      var x: i32 = 1;
      x++;
    }
  `;
  const { rootScope } = testParseWESL(src);

  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %main 
      { %x i32 x } #1
    } #0"
  `);
});

test("two fns", () => {
  const src = `
    fn foo() {}
    fn bar() {}
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %foo 
      {  } #1
      %bar 
      {  } #2
    } #0"
  `);
});

test("two fns, one with a decl", () => {
  const src = `
    fn foo() {
      var a:u32;
    }
    fn bar() {}
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %foo 
      { %a u32 } #1
      %bar 
      {  } #2
    } #0"
  `);
});

test("fn ref", () => {
  const src = `
    fn foo() {
      bar();
    }
    fn bar() {}
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %foo 
      { bar } #1
      %bar 
      {  } #2
    } #0"
  `);
});

test("struct", () => {
  const src = `
    struct A {
      a: B,
    }
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %A 
      { B } #1
    } #0"
  `);
});

test("alias", () => {
  const src = `
    alias A = B;
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %A 
      { B } #1
    } #0"
  `);
});

test("switch", () => {
  const src = `
    fn main() {
      var code = 1u;
      switch ( code ) {
        case 5u: { if 1 > 0 { var x = 7;} }
        default: { break; }
      }
    }`;
  const { rootScope } = testParseWESL(src);

  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %main 
      { %code code 
        { 
          { %x } #3
        } #2
        {  } #4
      } #1
    } #0"
  `);
});

test("for()", () => {
  const src = `
    fn main() {
      var i = 1.0;
      for (var i = 0; i < 10; i++) { }
    }`;
  const { rootScope } = testParseWESL(src);

  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
  "{ %main 
    { %i 
      { %i i i } #2
    } #1
  } #0"
`);
});

test("fn with param", () => {
  const src = `
    fn main(i: i32) {
      var x = 10 + i;
      for (var i = 0; i < x; i++) { }
    }`;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %main 
      { %i i32 %x i 
        { %i i x i } #2
      } #1
    } #0"
  `);
});

test("fn decl scope", () => {
  const src = `
    fn main(i: i32) {
      var x = i;
    }`;
  const { rootScope } = testParseWESL(src);
  const mainIdent = rootScope.contents[0] as DeclIdent;
  expect(scopeToString(mainIdent.scope)).toMatchInlineSnapshot(
    `"{ %i i32 %x i } #1"`,
  );
});

test("builtin scope", () => {
  const src = `fn main( @builtin(vertex_index) a: u32) { }`;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %main 
      { %a u32 } #1
    } #0"
  `);
});

test("builtin enums", () => {
  const src = `struct read { a: vec2f } var<storage, read_write> storage_buffer: read;`;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %read 
      { vec2f } #1
      storage read_write %storage_buffer read} #0"
  `);
});

test("texture_storage_2d", () => {
  const src = `
    @binding(3) @group(0) var tex_out : texture_storage_2d<rgba8unorm, write>;
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(
    `"{ %tex_out texture_storage_2d rgba8unorm write } #0"`,
  );
});

test("ptr 2 params", () => {
  const src = `
    fn foo(ptr: ptr<private, u32>) { }
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %foo 
      { %ptr ptr private u32 } #1
    } #0"
  `);
});

test("ptr 3 params", () => {
  const src = `
    fn foo(ptr: ptr<storage, array<u32, 128>, read>) { }
  `;
  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %foo 
      { %ptr ptr storage array u32 read } #1
    } #0"
  `);
});

test("larger example", () => {
  const src = `
    struct UBO { width : u32, }

    struct Buffer { weights : array<f32>, }

    @binding(0) @group(0) var<uniform> ubo : UBO;
    @binding(1) @group(0) var<storage, read> buf_in : Buffer;
    @binding(2) @group(0) var<storage, read_write> buf_out : Buffer;
    @binding(3) @group(0) var tex_in : texture_2d<f32>;
    @binding(3) @group(0) var tex_out : texture_storage_2d<rgba8unorm, write>;

    @compute @workgroup_size(64)
    fn import_level(@builtin(global_invocation_id) coord : vec3u) {
      _ = &buf_in;
      let offset = coord.x + coord.y * ubo.width;
      buf_out.weights[offset] = textureLoad(tex_in, vec2i(coord.xy), 0).w;
    }

    @compute @workgroup_size(64)
    fn export_level(@builtin(global_invocation_id) coord : vec3u) {
      if (all(coord.xy < vec2u(textureDimensions(tex_out)))) {
        let dst_offset = coord.x    + coord.y    * ubo.width;
        let src_offset = coord.x*2u + coord.y*2u * ubo.width;

        let a = buf_in.weights[src_offset + 0u];
        let b = buf_in.weights[src_offset + 1u];
        let c = buf_in.weights[src_offset + 0u + ubo.width];
        let d = buf_in.weights[src_offset + 1u + ubo.width];
        let sum = dot(vec4f(a, b, c, d), vec4f(1.0));

        buf_out.weights[dst_offset] = sum / 4.0;

        let probabilities = vec4f(a, a+b, a+b+c, sum) / max(sum, 0.0001);
        textureStore(tex_out, vec2i(coord.xy), probabilities);
      }
    }
  `;

  const { rootScope } = testParseWESL(src);
  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
    "{ %UBO 
      { u32 } #1
      %Buffer 
      { array f32 } #2
      uniform %ubo UBO storage read %buf_in Buffer storage 
      read_write %buf_out Buffer %tex_in texture_2d f32 %tex_out 
      texture_storage_2d rgba8unorm write %import_level 
      { %coord vec3u buf_in %offset coord coord ubo buf_out 
        offset textureLoad tex_in vec2i coord} #3
      %export_level 
      { %coord vec3u all coord vec2u textureDimensions tex_out 
        { %dst_offset coord coord ubo %src_offset coord coord 
          ubo %a buf_in src_offset %b buf_in src_offset %c buf_in 
          src_offset ubo %d buf_in src_offset ubo %sum dot vec4f a
           b c d vec4f buf_out dst_offset sum %probabilities vec4f
           a a b a b c sum max sum textureStore tex_out vec2i 
          coord probabilities} #5
      } #4
    } #0"
  `);
});

test("scope with an attribute", () => {
  const src = `
    fn main() {
      @if(foo){ }
    }
  `;
  const { rootScope } = testParseWESL(src);

  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
  "{ %main 
    { 
       @if(foo) {  } #2
    } #1
  } #0"
`);
});

test("partial scope", () => {
  const src = `
    fn main() {
      var x = 1;

      @if(false) y = 2;
    }
  `;
  const { rootScope } = testParseWESL(src);

  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
  "{ %main 
    { %x 
       @if(false) -{ y } #2
    } #1
  } #0"
`);
});

test("loop scope", () => {
  const src = `
    fn main() {
      let a = 7;
      loop {
        let a = 1;
        continuing {
          let a = 2;
        }
      }
    }
  `;
  const { rootScope } = testParseWESL(src);

  expect(scopeToString(rootScope)).toMatchInlineSnapshot(`
  "{ %main 
    { %a 
      { %a 
        { %a } #3
      } #2
    } #1
  } #0"
`);
});

// test("", () => {
//   const src = `
//   `;
//   const { rootScope } = testParseWESL(src);

//   expect(scopeToString(rootScope)).toMatchInlineSnapshot('tbd');

// });
