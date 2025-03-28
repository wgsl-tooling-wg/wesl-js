import { findValidRootDecls } from "../BindIdents.ts";
import { scopeToString } from "../debug/ScopeToString.ts";
import type { WeslAST } from "../ParseWESL.ts";
import { resetScopeIds } from "../Scope.ts";
import { parseWESL } from "./TestUtil.ts";
import { assertSnapshot } from "@std/testing/snapshot";

function testParseWESL(src: string): WeslAST {
  resetScopeIds();
  return parseWESL(src);
}

Deno.test("scope from simple fn", async (t) => {
  const src = `
    fn main() {
      var x: i32 = 1;
    }
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("scope from fn with reference", async (t) => {
  const src = `
    fn main() {
      var x: i32 = 1;
      x++;
    }
  `;
  const { rootScope } = testParseWESL(src);

  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("two fns", async (t) => {
  const src = `
    fn foo() {}
    fn bar() {}
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("two fns, one with a decl", async (t) => {
  const src = `
    fn foo() {
      var a:u32;
    }
    fn bar() {}
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("fn ref", async (t) => {
  const src = `
    fn foo() {
      bar();
    }
    fn bar() {}
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("struct", async (t) => {
  const src = `
    struct A {
      a: B,
    }
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("alias", async (t) => {
  const src = `
    alias A = B;
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("switch", async (t) => {
  const src = `
    fn main() {
      var code = 1u;
      switch ( code ) {
        case 5u: { if 1 > 0 { var x = 7;} }
        default: { break; }
      }
    }`;
  const { rootScope } = testParseWESL(src);

  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("for()", async (t) => {
  const src = `
    fn main() {
      var i = 1.0;
      for (var i = 0; i < 10; i++) { }
    }`;
  const { rootScope } = testParseWESL(src);

  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("fn with param", async (t) => {
  const src = `
    fn main(i: i32) {
      var x = 10 + i;
      for (var i = 0; i < x; i++) { }
    }`;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("fn decl scope", async (t) => {
  const src = `
    fn main(i: i32) {
      var x = i;
    }`;
  const { rootScope } = testParseWESL(src);
  const decls = findValidRootDecls(rootScope, {});
  const mainIdent = decls[0];
  await assertSnapshot(t, scopeToString(mainIdent.dependentScope!));
});

Deno.test("builtin scope", async (t) => {
  const src = `fn main( @builtin(vertex_index) a: u32) { }`;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("builtin enums", async (t) => {
  const src =
    `struct read { a: vec2f } var<storage, read_write> storage_buffer: read;`;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("texture_storage_2d", async (t) => {
  const src = `
    @binding(3) @group(0) var tex_out : texture_storage_2d<rgba8unorm, write>;
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("ptr 2 params", async (t) => {
  const src = `
    fn foo(ptr: ptr<private, u32>) { }
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("ptr 3 params", async (t) => {
  const src = `
    fn foo(ptr: ptr<storage, array<u32, 128>, read>) { }
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("larger example", async (t) => {
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
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("scope with an attribute", async (t) => {
  const src = `
    fn main() {
      @if(foo){ }
    }
  `;
  const { rootScope } = testParseWESL(src);

  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("partial scope", async (t) => {
  const src = `
    fn main() {
      var x = 1;

      @if(false) y = 2;
    }
  `;
  const { rootScope } = testParseWESL(src);

  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("loop scope", async (t) => {
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

  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("nested scope test", async (t) => {
  const src = `
    fn main() {
      let bar = 72;
      if (true) {
        if (true) {
          let new_bar = bar; // Should be 72!
        }
        let bar = 5;
      }
    }
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("@if fn", async (t) => {
  const src = `
    const loc = 0;

    @if(true) @fragment
    fn fragmentMain(@location(0) p: vec3f) -> @location(loc) vec4f { 
      let x = p;
    }
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("@if const", async (t) => {
  const src = `
    @if(true) const a = 0;
  `;
  const { rootScope } = testParseWESL(src);
  await assertSnapshot(t, scopeToString(rootScope));
});

Deno.test("var<private> a: i32;", async (t) => {
  const src = `
    var<private> a: i32 = 0;
  `;
  const { rootScope } = testParseWESL(src);

  await assertSnapshot(t, scopeToString(rootScope));
});

// Deno.test("", () => {
//   const src = `
//   `;
//   const { rootScope } = testParseWESL(src);
//   expect(scopeToString(rootScope)).toMatchInlineSnapshot('tbd');
// });
