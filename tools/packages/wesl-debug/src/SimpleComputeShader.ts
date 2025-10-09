import { copyBuffer, elementStride, type WgslElementType } from "thimbleberry";
import { requestWeslDevice } from "wesl";
import { compileShader } from "./CompileShader.ts";
import { withErrorScopes } from "./ErrorScopes.ts";

const resultBufferSize = 16; // 4x4 bytes

/**
 * Transpiles and runs a simple compute shader on the GPU for testing.
 *
 * A storage buffer is available for the shader to write test results.
 * `test::results[0]` is the first element of the buffer in wesl.
 * After execution the storage buffer is copied back to the CPU and returned
 * for test validation.
 *
 * Shader libraries mentioned in the shader source are attached automatically
 * if they are in node_modules.
 *
 * @param module - The compiled GPUShaderModule containing the compute shader.
 * The shader is invoked once.
 * @param resultFormat - format for interpreting the result buffer data. (default u32)
 * @returns storage result array (typically four numbers if the buffer format is u32 or f32)
 */
export async function testComputeShader(
  projectDir: string,
  gpu: GPU,
  src: string,
  resultFormat: WgslElementType,
  conditions: Record<string, boolean> = {},
): Promise<number[]> {
  const adapter = await gpu.requestAdapter();
  const device = await requestWeslDevice(adapter);
  try {
    const arraySize = resultBufferSize / elementStride(resultFormat);
    const arrayType = `array<${resultFormat}, ${arraySize}>`;
    const virtualLibs = {
      test: () =>
        `@group(0) @binding(0) var <storage, read_write> results: ${arrayType};`,
    };
    const params = { projectDir, device, src, conditions, virtualLibs };
    const module = await compileShader(params);
    const result = await runSimpleComputePipeline(device, module, resultFormat);
    return result;
  } finally {
    device.destroy();
  }
}

/**
 * Transpiles and runs a simple compute shader on the GPU for testing.
 *
 * a 16 byte storage buffer is available for the shader at `@group(0) @binding(0)`.
 * Compute shaders can write test results into the buffer.
 * After execution the storage buffer is copied back to the CPU and returned
 * for test validation.
 *
 * Shader libraries mentioned in the shader source are attached automatically
 * if they are in node_modules.
 *
 * @param module - The compiled GPUShaderModule containing the compute shader.
 * The shader is invoked once.
 * @param resultFormat - format for interpreting the result buffer data. (default u32)
 * @returns storage result array
 */
export async function runSimpleComputePipeline(
  device: GPUDevice,
  module: GPUShaderModule,
  resultFormat?: WgslElementType,
): Promise<number[]> {
  return await withErrorScopes(device, async () => {
    const bgLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
        },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bgLayout],
    });

    const pipeline = device.createComputePipeline({
      layout: pipelineLayout,
      compute: { module },
    });

    const storageBuffer = device.createBuffer({
      label: "storage",
      size: resultBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });

    // Initialize buffer with sentinel values to detect unwritten results
    // Using -999.0 as a distinctive value that should never appear in valid test results
    const mappedBuffer = new Float32Array(storageBuffer.getMappedRange());
    mappedBuffer.fill(-999.0);
    storageBuffer.unmap();

    const bindGroup = device.createBindGroup({
      layout: bgLayout,
      entries: [{ binding: 0, resource: { buffer: storageBuffer } }],
    });

    const commands = device.createCommandEncoder();
    const pass = commands.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(1);
    pass.end();
    device.queue.submit([commands.finish()]);

    const data = await copyBuffer(device, storageBuffer, resultFormat);
    return data;
  });
}
