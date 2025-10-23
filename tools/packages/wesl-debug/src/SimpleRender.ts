import { withTextureCopy } from "thimbleberry";
import { withErrorScopes } from "./ErrorScopes.ts";

export interface SimpleRenderParams {
  device: GPUDevice;

  /** shader module to run, presumed to have one vertex and one fragment entry */
  module: GPUShaderModule;

  /** format of the output texture. default "rgba32float" */
  outputFormat?: GPUTextureFormat;

  /** size of the output texture. default [1, 1]
   * Use [2, 2] for derivative tests
   * Use [512, 512] for visual image tests */
  size?: [number, number];

  /**  bind these textures and samplers in group 0, starting from binding 1 */
  inputTextures?: Array<{ texture: GPUTexture; sampler: GPUSampler }>;

  /** pass these uniforms to the shader in group 0 binding 0 */
  uniformBuffer?: GPUBuffer;
}

/**
 * Executes a render pipeline with the given shader module.
 * Creates a texture with the specified format, renders to it, and returns all pixel data.
 * @returns output texture contents in a flattened array (rows flattened, color channels interleaved).
 */
export async function simpleRender(
  params: SimpleRenderParams,
): Promise<number[]> {
  const { device, module } = params;
  const { outputFormat = "rgba32float", size = [1, 1] } = params;
  const { inputTextures = [], uniformBuffer } = params;

  return await withErrorScopes(device, async () => {
    const texture = device.createTexture({
      label: "fragment-test-output",
      size: { width: size[0], height: size[1], depthOrArrayLayers: 1 },
      format: outputFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const bindings =
      uniformBuffer || inputTextures.length > 0
        ? createBindGroup(device, uniformBuffer, inputTextures)
        : undefined;
    const pipelineLayout = bindings
      ? device.createPipelineLayout({ bindGroupLayouts: [bindings.layout] })
      : "auto";
    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module },
      fragment: { module, targets: [{ format: outputFormat }] },
      primitive: { topology: "triangle-list" },
    });
    executeRenderPass(device, pipeline, texture, bindings?.bindGroup);
    const data = await withTextureCopy(device, texture, texData =>
      Array.from(texData),
    );
    texture.destroy();
    uniformBuffer?.destroy();
    return data;
  });
}

/**
 * Create bind group with optional uniforms and textures.
 * Binding layout: 0=uniform buffer (if provided), 1=tex0, 2=samp0, 3=tex1, 4=samp1, ...
 */
export function createBindGroup(
  device: GPUDevice,
  uniformBuffer: GPUBuffer | undefined,
  inputTextures: Array<{ texture: GPUTexture; sampler: GPUSampler }> = [],
): { layout: GPUBindGroupLayout; bindGroup: GPUBindGroup } {
  const entries: GPUBindGroupLayoutEntry[] = [];
  const bindGroupEntries: GPUBindGroupEntry[] = [];
  if (uniformBuffer) {
    entries.push({
      binding: 0,
      visibility: GPUShaderStage.FRAGMENT,
      buffer: { type: "uniform" },
    });
    bindGroupEntries.push({ binding: 0, resource: { buffer: uniformBuffer } });
  }
  inputTextures.forEach((input, i) => {
    const [texBinding, sampBinding] = [i * 2 + 1, i * 2 + 2];
    entries.push({
      binding: texBinding,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: "float" },
    });
    entries.push({
      binding: sampBinding,
      visibility: GPUShaderStage.FRAGMENT,
      sampler: { type: "filtering" },
    });
    bindGroupEntries.push({
      binding: texBinding,
      resource: input.texture.createView(),
    });
    bindGroupEntries.push({ binding: sampBinding, resource: input.sampler });
  });
  const layout = device.createBindGroupLayout({ entries });
  const bindGroup = device.createBindGroup({
    layout,
    entries: bindGroupEntries,
  });
  return { layout, bindGroup };
}

/** Execute render pass and submit commands. */
function executeRenderPass(
  device: GPUDevice,
  pipeline: GPURenderPipeline,
  texture: GPUTexture,
  bindGroup?: GPUBindGroup,
): void {
  const commandEncoder = device.createCommandEncoder();
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: texture.createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: "store",
      },
    ],
  });
  renderPass.setPipeline(pipeline);
  if (bindGroup) renderPass.setBindGroup(0, bindGroup);
  renderPass.draw(3);
  renderPass.end();
  device.queue.submit([commandEncoder.finish()]);
}
