import { SrcMapBuilder } from "@wesl/mini-parse";
import { expectTrimmedMatch } from "@wesl/mini-parse/vitest-util";
import { expect } from "@std/expect";
import { bindIdents } from "../BindIdents.ts";
import { astToString } from "../debug/ASTtoString.ts";
import { lowerAndEmit } from "../LowerAndEmit.ts";
import { parsedRegistry } from "../ParsedRegistry.ts";
import {
  bindingStructsPlugin,
  findRefsToBindingStructs,
  lowerBindingStructs,
  markBindingStructs,
  transformBindingReference,
  transformBindingStruct,
} from "../TransformBindingStructs.ts";
import { linkTestOpts, parseTest } from "./TestUtil.ts";
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("markBindingStructs true", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
  `;

  const ast = parseTest(src);
  const structs = markBindingStructs(ast.moduleElem);
  expect(structs.length).toBe(1);
  expect(structs[0].bindingStruct).toBe(true);
});

Deno.test("markBindingStructs false", () => {
  const src = `
    struct Bindings {
      particles: ptr<storage, array<f32>, read_write>, 
    }
  `;

  const ast = parseTest(src);
  const structs = markBindingStructs(ast.moduleElem);
  expect(structs.length).toBe(0);
});

Deno.test("transformBindingStruct", async (t) => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
  `;

  const rootAst = parseTest(src);
  bindIdents({ rootAst, registry: parsedRegistry() });
  const bindingStruct = markBindingStructs(rootAst.moduleElem)[0];
  const newVars = transformBindingStruct(bindingStruct, new Set());

  const srcBuilder = new SrcMapBuilder({ text: rootAst.srcModule.src });
  lowerAndEmit(srcBuilder, newVars, {});
  const linked = SrcMapBuilder.build([srcBuilder]).dest.text;
  await assertSnapshot(t, linked);
});

Deno.test("findRefsToBindingStructs", async (t) => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    struct NotBindings { a: i32 }
    var y: NotBindings;

    fn main(b: Bindings) {
      let x = b.particles;
      let z = y.a;
    }
  `;

  const rootAst = parseTest(src);
  bindIdents({ rootAst, registry: parsedRegistry() });
  markBindingStructs(rootAst.moduleElem)[0];
  const found = findRefsToBindingStructs(rootAst.moduleElem);
  expect(found.length).toBe(1);
  const foundAst = astToString(found[0].memberRef);
  await assertSnapshot(t, foundAst);
});

Deno.test("transformBindingReference", async (t) => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    fn main(b: Bindings) {
      let x = b.particles;
    }
  `;

  const rootAst = parseTest(src);
  bindIdents({ rootAst, registry: parsedRegistry() });
  const bindingStruct = markBindingStructs(rootAst.moduleElem)[0];
  transformBindingStruct(bindingStruct, new Set());
  const found = findRefsToBindingStructs(rootAst.moduleElem);
  expect(found.length).toBe(1);
  const { memberRef, struct } = found[0];
  const synthElem = transformBindingReference(memberRef, struct);
  const synthAst = astToString(synthElem);
  await assertSnapshot(t, synthAst);
});

Deno.test("lower binding structs", async (t) => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    fn main(b: Bindings) {
      let x = b.particles;
    }
  `;

  const expected = `
@group(0) @binding(0) var<storage, read_write> particles : array<f32>;
       
    fn main() {
      let x = particles;
    }
  `;
  const rootAst = parseTest(src);
  const { globalNames } = bindIdents({ rootAst, registry: parsedRegistry() });
  const tAst = { ...rootAst, globalNames, notableElems: {} };
  const lowered = lowerBindingStructs(tAst);

  const loweredAst = astToString(lowered.moduleElem);
  await assertSnapshot(t, loweredAst);

  const srcBuilder = new SrcMapBuilder({ text: lowered.srcModule.src });
  lowerAndEmit(srcBuilder, [lowered.moduleElem], {}, false);
  const linked = SrcMapBuilder.build([srcBuilder]).dest.text;
  expectTrimmedMatch(linked, expected);
});

Deno.test("lower binding structs with conflicting root name", async () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    const particles = 7;
    fn main(b: Bindings) {
      let x = b.particles;
    }
  `;

  const expected = `
@group(0) @binding(0) var<storage, read_write> particles0 : array<f32>;
       
    const particles = 7;
    fn main() {
      let x = particles0;
    }
  `;

  const opts = { config: { plugins: [bindingStructsPlugin()] } };
  const linked = await linkTestOpts(opts, src);
  expectTrimmedMatch(linked, expected);
});

Deno.test("lower 5 bindings", async () => {
  const src = `
    struct Uniforms {
      foo: u32
    }

    struct MyBindings {
      @group(0) @binding(0) particles: ptr<storage, array<u32>, read_write>, 
      @group(0) @binding(1) uniforms: ptr<uniform, Uniforms>, 
      @group(0) @binding(2) tex: texture_2d<rgba8unorm>,
      @group(0) @binding(3) samp: sampler,
      @group(0) @binding(4) stTex: texture_storage_2d<rgba8unorm, read>,
    }

    @compute fn main(b: MyBindings) {
      b.particles[0] = b.uniforms.foo;
    }
  `;

  const expected = `
@group(0) @binding(0) var<storage, read_write> particles : array<u32>;
@group(0) @binding(1) var<uniform> uniforms : Uniforms;
@group(0) @binding(2) var tex : texture_2d<rgba8unorm>;
@group(0) @binding(3) var samp : sampler;
@group(0) @binding(4) var stTex : texture_storage_2d<rgba8unorm, read>;

    struct Uniforms { foo: u32 }
    @compute fn main() {
      particles[0] = uniforms.foo;
    }
`;

  const opts = { config: { plugins: [bindingStructsPlugin()] } };
  const linked = await linkTestOpts(opts, src);
  expectTrimmedMatch(linked, expected);
});
