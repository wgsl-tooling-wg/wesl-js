import { expect } from "@std/expect";
import type { BindingStructElem, StructElem } from "../AbstractElems.ts";
import { astToString } from "../debug/ASTtoString.ts";
import {
  bindingGroupLayoutTs,
  reportBindingStructsPlugin,
} from "../Reflection.ts";
import { bindingStructsPlugin } from "../TransformBindingStructs.ts";
import { linkTestOpts } from "./TestUtil.ts";
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("extract binding struct", async (t) => {
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
      reportBindingStructsPlugin((report) => (found = report)),
    ],
  };
  linkTestOpts({ config }, src);

  // verify struct found
  expect(found).toBeDefined();
  const s = found![0];
  expect(s).toBeDefined();
  await assertSnapshot(t, astToString(s));
  expect(s.bindingStruct).toBeTruthy();
  expect((s as BindingStructElem).entryFn).toBeDefined();

  // verify struct members
  const members = s.members.filter((e) => e.kind === "member");
  const membersAst = members.map((e) => astToString(e)).join("\n");
  await assertSnapshot(t, membersAst);
});

Deno.test("binding struct to ts", async (t) => {
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
      reportBindingStructsPlugin((report) => (found = report)),
    ],
  };
  linkTestOpts({ config }, src);
  const ts = bindingGroupLayoutTs(found![0] as BindingStructElem);
  await assertSnapshot(t, ts);
});
