/// <reference types="wesl-plugin/suffixes" />
import { expectTrimmedMatch } from "mini-parse/vitest-util";
import { beforeAll, expect, test } from "vitest";
import { link } from "wesl";

let gpu: GPU;

beforeAll(async () => {
  const webgpu = await import("webgpu");
  Object.assign(globalThis, (webgpu as any).globals); // LATER fix types upstream in webgpu package

  gpu = webgpu.create([]);
});

test("gpu execution w/?link", async () => {
  // setup webgpu
  const adapter = await gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    expect(device).toBeDefined();
    return;
  }

  // import dynamically, so that import comes after globalThis has GPUShaderStage
  const linkParams = (await import("../../shaders/linkTest/main.wesl?link"))
    .default;

  const code = (await link(linkParams)).dest;

  // --- verify linked shader ---
  device.createShaderModule({ code }); // verify works for webgpu

  // verify matches expected text
  const expectedCode = ` 
    @group(0) @binding(0) var <uniform> u: Uniforms;

    @compute @workgroup_size(1)
    fn main() { }

    struct Uniforms { foo: u32 }
  `;
  expectTrimmedMatch(code, expectedCode);
});
