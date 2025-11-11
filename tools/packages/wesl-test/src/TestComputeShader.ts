import { copyBuffer, elementStride, type WgslElementType } from "thimbleberry";
import type { LinkParams } from "wesl";
import { withErrorScopes } from "wesl-gpu";
import { compileShader } from "./CompileShader.ts";
import { resolveShaderSource } from "./ShaderModuleLoader.ts";

const defaultResultSize = 4; // 4 elements

export interface ComputeTestParams {
  /** WESL/WGSL source code for the compute shader to test.
   * Either src or moduleName must be provided, but not both. */
  src?: string;

  /** Name of shader module to load from filesystem.
   * Supports: bare name (sum.wgsl), path (algorithms/sum.wgsl), or module path (package::algorithms::sum).
   * Either src or moduleName must be provided, but not both. */
  moduleName?: string;

  /** Project directory for resolving shader dependencies.
   * Allows the shader to import from npm shader libraries.
   * Optional: defaults to searching upward from cwd for package.json or wesl.toml.
   * Typically use `import.meta.url`. */
  projectDir?: string;

  /** GPU device for running the tests.
   * Typically use `getGPUDevice()` from wesl-test. */
  device: GPUDevice;

  /** Format of the result buffer. Default: "u32" */
  resultFormat?: WgslElementType;

  /** Size of result buffer in elements. Default: 4 */
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

  /** Number of workgroups to dispatch. Default: 1
   * Can be a single number or [x, y, z] for multi-dimensional dispatch. */
  dispatchWorkgroups?: number | [number, number, number];
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
export async function testCompute(
  params: ComputeTestParams,
): Promise<number[]> {
  const {
    projectDir,
    device,
    src,
    moduleName,
    conditions = {},
    constants,
    useSourceShaders,
    dispatchWorkgroups = 1,
  } = params;
  const { resultFormat = "u32", size = defaultResultSize } = params;

  // Resolve shader source from either src or moduleName
  const shaderSrc = await resolveShaderSource(src, moduleName, projectDir);

  const arrayType = `array<${resultFormat}, ${size}>`;
  const virtualLibs = {
    test: () =>
      `@group(0) @binding(0) var <storage, read_write> results: ${arrayType};`,
  };

  const module = await compileShader({
    projectDir,
    device,
    src: shaderSrc,
    conditions,
    constants,
    virtualLibs,
    useSourceShaders,
  });

  return await runCompute(
    device,
    module,
    resultFormat,
    size,
    dispatchWorkgroups,
  );
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
 * @param dispatchWorkgroups - Number of workgroups to dispatch (default: 1)
 * @returns Array containing the shader's output from the storage buffer
 */
export async function runCompute(
  device: GPUDevice,
  module: GPUShaderModule,
  resultFormat: WgslElementType = "u32",
  size = defaultResultSize,
  dispatchWorkgroups: number | [number, number, number] = 1,
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

    const storageBuffer = createStorageBuffer(
      device,
      size * elementStride(resultFormat),
    );
    const bindGroup = device.createBindGroup({
      layout: bgLayout,
      entries: [{ binding: 0, resource: { buffer: storageBuffer } }],
    });

    const commands = device.createCommandEncoder();
    const pass = commands.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    if (typeof dispatchWorkgroups === "number") {
      pass.dispatchWorkgroups(dispatchWorkgroups);
    } else {
      pass.dispatchWorkgroups(...dispatchWorkgroups);
    }
    pass.end();
    device.queue.submit([commands.finish()]);

    return await copyBuffer(device, storageBuffer, resultFormat);
  });
}

function createStorageBuffer(device: GPUDevice, targetSize: number): GPUBuffer {
  const buffer = device.createBuffer({
    label: "storage",
    size: targetSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  // Sentinel values to detect unwritten results
  new Float32Array(buffer.getMappedRange()).fill(-999.0);
  buffer.unmap();
  return buffer;
}
