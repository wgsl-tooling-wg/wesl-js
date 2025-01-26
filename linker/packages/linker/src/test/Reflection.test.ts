import { expect, test } from "vitest";
import { BindingStructElem, StructElem } from "../AbstractElems.ts";
import {
  bindingStructReflect,
  enableBindingStructs,
} from "../Configuration.ts";
import { elemToString } from "../debug/ASTtoString.ts";
import { linkTestOpts } from "./TestUtil.ts";
import { bindingGroupLayoutTs } from "../Reflection.ts";

test("extract binding struct", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }

    @compute fn main(b: Bindings) {
      let x = b.particles;
    }
  `;
  let found: StructElem[] | undefined;
  const linkConfig = bindingStructReflect(
    enableBindingStructs(),
    report => (found = report),
  );
  linkTestOpts({ linkConfig }, src);

  // verify struct found
  expect(found).toBeDefined();
  const s = found![0];
  expect(s).toBeDefined();
  expect(elemToString(s)).toMatchInlineSnapshot(`"struct Bindings"`);
  expect(s.bindingStruct).toBeTruthy();
  expect((s as BindingStructElem).entryFn).toBeDefined();

  // verify struct members
  const members = s.members.filter(e => e.kind === "member");
  const membersAst = members.map(e => elemToString(e)).join("\n");
  expect(membersAst).toMatchInlineSnapshot(
    `"member @group @binding particles: ptr<storage, array<f32>, read_write>"`,
  );
});

test("binding struct to ts", () => {
  const src = `
    struct Uniforms {
      foo: u32
    }
    struct MyBindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
      @group(0) @binding(1) uniforms: ptr<uniform, Uniforms>, 
      @group(0) @binding(2) tex: texture_2d<rgba8unorm>,
      @group(0) @binding(3) samp: sampler,
      @group(0) @binding(4) stTex: texture_storage_2d<rgba8unorm, read>,
    }
    @compute fn main(b: MyBindings) {
      let x = b.particles;
    }
  `;
  let found: StructElem[] | undefined;
  const linkConfig = bindingStructReflect(
    enableBindingStructs(),
    report => (found = report),
  );
  linkTestOpts({ linkConfig }, src);
  const ts = bindingGroupLayoutTs(found![0] as BindingStructElem);
  expect(ts).toMatchInlineSnapshot(`
    "
    const myBindingsEntries = [ 
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" }
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "uniform" }
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            texture: { sampleType: "float" }
          },
          {
            binding: 3,
            visibility: GPUShaderStage.COMPUTE,
            sampler: { type: "filtering" }
          },
          {
            binding: 4,
            visibility: GPUShaderStage.COMPUTE,
            storageTexture: { format: "rgba8unorm", sampleType: "float", access: "read-only" }
          } ];
    function myBindingsLayout(device: GPUDevice): GPUBindGroupLayout {
      return device.createBindGroupLayout({
        entries: myBindingsEntries 
      });
    }

    export const layoutFunctions = { myBindingsLayout };
    export const layoutEntries = { myBindingsEntries };
      "
  `);
});
