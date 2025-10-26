import { copyBuffer, elementStride, type WgslElementType } from "thimbleberry";
import type { LinkParams } from "wesl";
import { compileShader } from "./CompileShader.ts";
import { withErrorScopes } from "./ErrorScopes.ts";

const defaultResultSize = 16; // 4x4 bytes

export interface ComputeTestParams {
  /** WESL/WGSL source code for the compute shader to test. */
  src: string;

  /** Project directory for resolving shader dependencies.
   * Allows the shader to import from npm shader libraries.
   * Typically use `import.meta.url`. */
  projectDir: string;

  /** GPU device for running the tests.
   * Typically use `getGPUDevice()` from wesl-debug. */
  device: GPUDevice;

  /** Format of the result buffer. Default: "u32" */
  resultFormat?: WgslElementType;

  /** Size of result buffer in bytes. Default: 16 */
  size?: number;

  /** Flags for conditional compilation to test shader specialization.
   * Useful for testing `@if` statements in the shader. */
  conditions?: LinkParams["conditions"];

  /** Constants for shader compilation.
   * Injects host-provided values via the `constants::` namespace. */
  constants?: LinkParams["constants"];

  /** Use source shaders from current package instead of built bundles.
   * Default: true for faster iteration during development. */
  useSourceShaders?: boolean;
}

/**
 * Compiles and runs a compute shader on the GPU for testing.
 *
 * Provides a storage buffer available at `test::results` where the shader
 * can write test output. After execution, the storage buffer is copied back
 * to the CPU and returned for validation.
 *
 * Shader libraries mentioned in the source are automatically resolved from node_modules.
 *
 * @returns Array of numbers from the storage buffer (typically 4 elements for u32/f32 format)
 */
export async function testComputeShader(
  params: ComputeTestParams,
): Promise<number[]> {
  const {
    projectDir,
    device,
    src,
    conditions = {},
    constants,
    useSourceShaders,
  } = params;
  const { resultFormat = "u32", size = defaultResultSize } = params;

  const arraySize = size / elementStride(resultFormat);
  const arrayType = `array<${resultFormat}, ${arraySize}>`;
  const virtualLibs = {
    test: () =>
      `@group(0) @binding(0) var <storage, read_write> results: ${arrayType};`,
  };

  const module = await compileShader({
    projectDir,
    device,
    src,
    conditions,
    constants,
    virtualLibs,
    useSourceShaders,
  });

  return await runCompute(device, module, resultFormat, size);
}

/**
 * Runs a compiled compute shader and returns the result buffer.
 *
 * Creates a storage buffer at @group(0) @binding(0) where the shader can
 * write output. The shader is invoked once, then the buffer is copied back
 * to the CPU for reading.
 *
 * @param module - The compiled GPUShaderModule containing the compute shader
 * @param resultFormat - Format for interpreting result buffer data (default: u32)
 * @param size - Size of result buffer in bytes (default: 16)
 * @returns Array containing the shader's output from the storage buffer
 */
export async function runCompute(
  device: GPUDevice,
  module: GPUShaderModule,
  resultFormat?: WgslElementType,
  size = defaultResultSize,
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

    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bgLayout] }),
      compute: { module },
    });

    const storageBuffer = createStorageBuffer(device, size);
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

    return await copyBuffer(device, storageBuffer, resultFormat);
  });
}

function createStorageBuffer(device: GPUDevice, size: number): GPUBuffer {
  const buffer = device.createBuffer({
    label: "storage",
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  // Sentinel values to detect unwritten results
  new Float32Array(buffer.getMappedRange()).fill(-999.0);
  buffer.unmap();
  return buffer;
}
