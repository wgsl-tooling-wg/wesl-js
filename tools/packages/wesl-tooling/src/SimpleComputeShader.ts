import {
  link,
  requestWeslDevice,
  type VirtualLibraryFn,
  type WeslDevice,
} from "wesl";
import { dependencyBundles } from "./ParseDependencies.ts";
import { copyBuffer, type GPUElementFormat } from "thimbleberry";

const resultBufferSize = 16; // 4x4 bytes

export interface CompileShaderParams {
  /** The project directory, used for resolving dependencies.  */
  projectDir: string;
  
  /** The GPUDevice to use for shader compilation. */
  device: GPUDevice;

  /** The WGSL/WESL shader source code. */
  src: string;

  /** Optional conditions for shader compilation. */
  conditions?: Record<string, boolean>;

  /** Optional virtual libraries to include in the shader. */
  virtualLibs?: Record<string, VirtualLibraryFn>;
}
/**
 * Compiles a single WESL shader source string into a GPUShaderModule for testing
 * with automatic package detection.
 *
 * Parses the shader source to find references to wesl packages, and
 * then searches installed npm packages to find the appropriate npm package
 * bundle to include in the link.
 *
 * @param projectDir - The project directory, used for resolving dependencies.
 * @param device - The GPUDevice to use for shader compilation.
 * @param src - The WESL shader source code.
 * @returns A Promise that resolves to the compiled GPUShaderModule.
 */
export async function compileShader(
  params: CompileShaderParams,
): Promise<GPUShaderModule> {
  const { projectDir, device, src, conditions, virtualLibs } = params;
  const weslSrc = { main: src };
  const libs = await dependencyBundles(weslSrc, projectDir);
  const linked = await link({ weslSrc, libs, virtualLibs, conditions });

  // Unfortunately we can't call linked.createShaderModule()
  // because of limitations in the node-webgpu package.
  //
  // See: https://github.com/dawn-gpu/node-webgpu/issues/4
  //
  // We'll still see shader compilation errors from node-webgpu, they
  // just won't be mapped back to the original unlinked source code locations
  return device.createShaderModule({ code: linked.dest });
}

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
  resultFormat: GPUElementFormat = "f32",
  conditions: Record<string, boolean> = {},
): Promise<number[]> {
  const adapter = await gpu.requestAdapter();
  const device = await requestWeslDevice(adapter);
  try {
    const arraySize = resultBufferSize / elementByteSize(resultFormat);
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

/** size in bytes of a wgsl numeric type, e.g. 'f32' => 4 */
function elementByteSize(fmt: GPUElementFormat): number {
  const found = fmt.match(/\d+/);
  const bits = Number.parseInt(found?.[0] as string);
  return bits / 8;
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
  resultFormat?: GPUElementFormat,
): Promise<number[]> {
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
  });

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
}
