import { numComponents, withTextureCopy } from "thimbleberry";
import type { LinkParams } from "wesl";
import { compileShader } from "./CompileShader.ts";
import { withErrorScopes } from "./ErrorScopes.ts";

const fullscreenTriangleVertex = `
@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
  // Fullscreen triangle: covers viewport with 3 vertices, no vertex buffer needed
  // Vertex 0: bottom-left (-1, -1)
  // Vertex 1: bottom-right beyond viewport (3, -1)
  // Vertex 2: top-left beyond viewport (-1, 3)
  var pos: vec2f;
  if (idx == 0u) {
    pos = vec2f(-1.0, -1.0);
  } else if (idx == 1u) {
    pos = vec2f(3.0, -1.0);
  } else {
    pos = vec2f(-1.0, 3.0);
  }
  return vec4f(pos, 0.0, 1.0);
}`;

export interface FragmentTestParams {
  /** WESL/WGSL source code for a fragment shader to test*/
  src: string;

  /** directory in your project. Used so that the test library
   * can find installed npm shader libraries.
   * That way your fragment shader can use import statements
   * from shader npm libraries.
   * (typically use import.meta.url) */
  projectDir: string;

  /** gpu device for running the tests.
   * (typically use getGPUDevice() from wesl-debug) */
  device: GPUDevice;

  /** optionally select the texture format for the output texture
   * default: "rgba32float" */
  textureFormat?: GPUTextureFormat;

  /** optionally specify the size of the output texture.
   * default: [1, 1] for simple color tests.
   * Use [2, 2] for derivative tests (forms a complete 2x2 quad for dpdx/dpdy) */
  size?: [width: number, height: number];

  /** flags for conditional compilation for testing shader specialization.
   * useful to test `@if` statements in the shader.  */
  conditions?: LinkParams["conditions"];

  /** constants for shader compilation.
   * useful to inject host-provided values via the `constants::` namespace.  */
  constants?: LinkParams["constants"];

  /** input textures + samplers for the shader.
   * binds sequentially: [0]=texture, [1]=sampler, [2]=texture, [3]=sampler, ... */
  inputTextures?: Array<{
    texture: GPUTexture;
    sampler: GPUSampler;
  }>;
}

/**
 * Executes a fragment shader test and returns pixel (0,0) values for validation.
 * Renders using a fullscreen triangle to the specified texture format (default: rgba32float).
 * Default: [1, 1] texture for simple color tests
 * Use [2, 2] for derivative tests (forms a complete 2x2 quad for dpdx/dpdy)
 */
export async function testFragmentShader(
  params: FragmentTestParams,
): Promise<number[]> {
  const { projectDir, device, src, conditions = {}, constants } = params;
  const { textureFormat = "rgba32float", size = [1, 1] } = params;
  const { inputTextures } = params;

  // Put user's fragment shader first as it may contain import statements
  const completeSrc = src + "\n\n" + fullscreenTriangleVertex;

  const shaderParams = {
    projectDir,
    device,
    src: completeSrc,
    conditions,
    constants,
  };
  const module = await compileShader(shaderParams);
  return await runSimpleRenderPipeline(
    device,
    module,
    textureFormat,
    size,
    inputTextures,
  );
}

/** Create bind group for input textures. Bindings: texture at N, sampler at N+1. */
function createTextureBindGroup(
  device: GPUDevice,
  inputTextures: Array<{ texture: GPUTexture; sampler: GPUSampler }>,
): { layout: GPUBindGroupLayout; bindGroup: GPUBindGroup } {
  const entries: GPUBindGroupLayoutEntry[] = [];
  const bindGroupEntries: GPUBindGroupEntry[] = [];

  inputTextures.forEach((input, i) => {
    const textureBinding = i * 2;
    const samplerBinding = i * 2 + 1;

    entries.push({
      binding: textureBinding,
      visibility: GPUShaderStage.FRAGMENT,
      texture: { sampleType: "float" },
    });
    entries.push({
      binding: samplerBinding,
      visibility: GPUShaderStage.FRAGMENT,
      sampler: { type: "filtering" },
    });

    bindGroupEntries.push({
      binding: textureBinding,
      resource: input.texture.createView(),
    });
    bindGroupEntries.push({
      binding: samplerBinding,
      resource: input.sampler,
    });
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
  if (bindGroup) {
    renderPass.setBindGroup(0, bindGroup);
  }
  renderPass.draw(3);
  renderPass.end();
  device.queue.submit([commandEncoder.finish()]);
}

/**
 * Executes a render pipeline with the given shader module.
 * Creates a texture with the specified format, renders to it, and reads back pixel (0,0).
 */
export async function runSimpleRenderPipeline(
  device: GPUDevice,
  module: GPUShaderModule,
  textureFormat: GPUTextureFormat = "rgba32float",
  size = [1, 1],
  inputTextures: Array<{ texture: GPUTexture; sampler: GPUSampler }> = [],
): Promise<number[]> {
  return await withErrorScopes(device, async () => {
    const texture = device.createTexture({
      label: "fragment-test-output",
      size: { width: size[0], height: size[1], depthOrArrayLayers: 1 },
      format: textureFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });

    const textureBindings =
      inputTextures.length > 0
        ? createTextureBindGroup(device, inputTextures)
        : undefined;

    const pipelineLayout = textureBindings
      ? device.createPipelineLayout({
          bindGroupLayouts: [textureBindings.layout],
        })
      : "auto";

    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module },
      fragment: {
        module,
        targets: [{ format: textureFormat }],
      },
      primitive: { topology: "triangle-list" },
    });

    executeRenderPass(device, pipeline, texture, textureBindings?.bindGroup);

    const extractCount = numComponents(textureFormat);
    const data = await withTextureCopy(device, texture, texData =>
      Array.from(texData.slice(0, extractCount)),
    );

    texture.destroy();
    return data;
  });
}
