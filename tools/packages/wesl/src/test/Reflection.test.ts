import { expect, test } from "vitest";
import { BindingStructElem, StructElem } from "../AbstractElems.ts";
import { astToString } from "../debug/ASTtoString.ts";
import {
  bindingGroupLayoutTs,
  reportBindingStructsPlugin,
} from "../Reflection.ts";
import { bindingStructsPlugin } from "../TransformBindingStructs.ts";
import { linkTestOpts } from "./TestUtil.ts";

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
  const config = {
    plugins: [
      bindingStructsPlugin(),
      reportBindingStructsPlugin(report => (found = report)),
    ],
  };
  linkTestOpts({ config }, src);

  // verify struct found
  expect(found).toBeDefined();
  const s = found![0];
  expect(s).toBeDefined();
  expect(astToString(s)).toMatchInlineSnapshot(`
    "struct Bindings
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
        }'"
  `);
  expect(s.bindingStruct).toBeTruthy();
  expect((s as BindingStructElem).entryFn).toBeDefined();

  // verify struct members
  const members = s.members.filter(e => e.kind === "member");
  const membersAst = members.map(e => astToString(e)).join("\n");
  expect(membersAst).toMatchInlineSnapshot(
    `
    "member @group @binding particles: ptr<storage, array<f32>, read_write>
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
        text '>'"
  `,
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
      @group(0) @binding(2) tex: texture_2d<f32>,
      @group(0) @binding(3) samp: sampler,
      @group(0) @binding(4) stTex: texture_storage_2d<rgba8unorm, read>,
    }
    @compute fn main(b: MyBindings) {
      let x = b.particles;
    }
  `;
  let found: StructElem[] | undefined;
  const config = {
    plugins: [
      bindingStructsPlugin(),
      reportBindingStructsPlugin(report => (found = report)),
    ],
  };
  linkTestOpts({ config }, src);
  const ts = bindingGroupLayoutTs(found![0] as BindingStructElem);
  expect(ts).toMatchInlineSnapshot(`
    "
    const myBindingsEntries = [ 
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" }
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
    export const layouts = { myBindingsEntries };
      "
  `);
});
