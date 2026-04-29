import { afterAll, beforeAll, expect, test } from "vitest";
import { linkComputeShader, runCompute } from "../ComputePipeline.ts";
import { getTestDevice } from "./TestGpu.ts";

let device: GPUDevice | null = null;

beforeAll(async () => {
  device = await getTestDevice();
});

afterAll(() => {
  device?.destroy();
});

test("runCompute reads back a 4-element f32 buffer", async () => {
  if (!device) return; // skip when no GPU (sandbox)
  const computeSource = `
    @group(0) @binding(0) var<storage, read_write> result: array<f32, 4>;

    @compute @workgroup_size(4)
    fn main(@builtin(global_invocation_id) id: vec3u) {
      result[id.x] = f32(id.x * id.x);
    }
  `;
  const { module } = await linkComputeShader({ device, computeSource });

  const buffer = device.createBuffer({
    label: "result",
    size: 16,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  const layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ],
  });
  const bindGroup = device.createBindGroup({
    layout,
    entries: [{ binding: 0, resource: { buffer } }],
  });
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [layout],
  });

  const { readbacks } = await runCompute({
    device,
    module,
    entryPoint: "main",
    bindGroup,
    pipelineLayout,
    readBuffers: new Map([["result", buffer]]),
  });

  const arr = new Float32Array(readbacks.get("result")!);
  expect(Array.from(arr)).toEqual([0, 1, 4, 9]);
});
