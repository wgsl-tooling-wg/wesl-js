/// <reference types="wesl-plugin" />
import { copyBuffer } from "thimbleberry";
import { beforeAll, expect, test } from "vitest";
import { bindingStructsPlugin, link2, LinkConfig } from "wesl";

let gpu: GPU;

beforeAll(async () => {
  const webgpu = await import("webgpu");
  Object.assign(globalThis, (webgpu as any).globals); // TODO fix types upstream in webgpu package

  gpu = webgpu.create([]);
});

// load shader sources
const weslRoot = "../../shaders";
const weslSrc = import.meta.glob("../../shaders/*.wesl", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

test("gpu execution w/binding structs lowered and reflected", async () => {
  // --- load reflected binding structs ---

  // import dynamically, so that import comes after globalThis has GPUShaderStage
  const reflected = await import("../../shaders/app.wesl?reflect");
  const { layoutEntries, layoutFunctions } = reflected;

  const adapter = await gpu.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    console.error("no GPU device available");
    return;
  }
  const bgLayout = layoutFunctions.myBindingsLayout(device);

  // --- link with binding struct lowering ---
  const config: LinkConfig = {
    plugins: [bindingStructsPlugin()],
  };
  const code = link2({ weslSrc, weslRoot, rootModuleName: "app", config }).dest;

  // --- execute linked shader ---
  const module = device.createShaderModule({ code });

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bgLayout],
  });

  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module,
    },
  });

  const storageBuffer = device.createBuffer({
    label: "storage",
    size: 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const uniformsBuffer = device.createBuffer({
    label: "uniforms",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: bgLayout,
    entries: [
      { binding: 0, resource: { buffer: storageBuffer } },
      { binding: 1, resource: { buffer: uniformsBuffer } },
    ],
  });

  const fooValue = 4; // .foo in struct Uniforms
  device.queue.writeBuffer(
    uniformsBuffer,
    0,
    new Uint32Array([fooValue, 2, 3, 1]),
  );

  const commands = device.createCommandEncoder();
  const pass = commands.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(1, 1, 1);
  pass.end();
  device.queue.submit([commands.finish()]);

  // --- verify that shader correctly copied a value from uniforms to storage buffer --
  const data = await copyBuffer(device, storageBuffer);
  expect(data[0]).toBe(fooValue);
});
