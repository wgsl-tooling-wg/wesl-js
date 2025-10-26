import { SrcMapBuilder } from "mini-parse";
import { expectTrimmedMatch } from "mini-parse/vitest-util";
import { expect, test } from "vitest";
import { bindIdents } from "../BindIdents.ts";
import { astToString } from "../debug/ASTtoString.ts";
import { lowerAndEmit } from "../LowerAndEmit.ts";
import { RegistryResolver } from "../ModuleResolver.ts";
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

test("markBindingStructs true", () => {
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

test("markBindingStructs false", () => {
  const src = `
    struct Bindings {
      particles: ptr<storage, array<f32>, read_write>, 
    }
  `;

  const ast = parseTest(src);
  const structs = markBindingStructs(ast.moduleElem);
  expect(structs.length).toBe(0);
});

test("transformBindingStruct", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
  `;

  const rootAst = parseTest(src);
  bindIdents({ rootAst, resolver: new RegistryResolver(parsedRegistry()) });
  const bindingStruct = markBindingStructs(rootAst.moduleElem)[0];
  const newVars = transformBindingStruct(bindingStruct, new Set());

  const srcBuilder = new SrcMapBuilder({ text: rootAst.srcModule.src });
  lowerAndEmit({ srcBuilder, rootElems: newVars, conditions: {} });
  const linked = SrcMapBuilder.build([srcBuilder]).dest.text;
  expect(linked).toMatchInlineSnapshot(
    `
    "@group(0) @binding(0) var<storage, read_write> particles : array<f32>;
    "
  `,
  );
});

test("findRefsToBindingStructs", () => {
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
  bindIdents({ rootAst, resolver: new RegistryResolver(parsedRegistry()) });
  markBindingStructs(rootAst.moduleElem);
  const found = findRefsToBindingStructs(rootAst.moduleElem);
  expect(found.length).toBe(1);
  const foundAst = astToString(found[0].memberRef);
  expect(foundAst).toMatchInlineSnapshot(`
    "memberRef b.particles
      ref b
      text '.'
      name particles"
  `);
});

test("transformBindingReference", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    fn main(b: Bindings) {
      let x = b.particles;
    }
  `;

  const rootAst = parseTest(src);
  bindIdents({ rootAst, resolver: new RegistryResolver(parsedRegistry()) });
  const bindingStruct = markBindingStructs(rootAst.moduleElem)[0];
  transformBindingStruct(bindingStruct, new Set());
  const found = findRefsToBindingStructs(rootAst.moduleElem);
  expect(found.length).toBe(1);
  const { memberRef, struct } = found[0];
  const synthElem = transformBindingReference(memberRef, struct);
  const synthAst = astToString(synthElem);
  expect(synthAst).toMatchInlineSnapshot(`"synthetic 'particles'"`);
});

test("lower binding structs", () => {
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
  const { globalNames } = bindIdents({
    rootAst,
    resolver: new RegistryResolver(parsedRegistry()),
  });
  const tAst = { ...rootAst, globalNames, notableElems: {} };
  const lowered = lowerBindingStructs(tAst);

  const loweredAst = astToString(lowered.moduleElem);
  expect(loweredAst).toMatchInlineSnapshot(`
    "module
      synthetic '@group(0) @binding(0) var<storage, read_write> particles : array<f32>;
    '
      text '
        '
      text '
        '
      fn main(b: Bindings)
        decl %main
        param
        statement
          text '{
          let '
          typeDecl %x
            decl %x
          text ' = '
          memberRef b.particles
            synthetic 'particles'
          text ';
        }'
      text '
      '"
  `);

  const srcBuilder = new SrcMapBuilder({ text: lowered.srcModule.src });
  lowerAndEmit({
    srcBuilder,
    rootElems: [lowered.moduleElem],
    conditions: {},
    extracting: false,
  });
  const linked = SrcMapBuilder.build([srcBuilder]).dest.text;
  expectTrimmedMatch(linked, expected);
});

test("lower binding structs with conflicting root name", async () => {
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

test("lower 5 bindings", async () => {
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
