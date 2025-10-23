import { componentByteSize, numComponents, texelLoadType } from "thimbleberry";
import type { LinkParams } from "wesl";
import { compileShader } from "./CompileShader.ts";
import {
  createUniformsVirtualLib,
  type RenderUniforms,
  renderUniformBuffer,
} from "./RenderUniforms.ts";
import { simpleRender } from "./SimpleRender.ts";

export const fullscreenTriangleVertex = `
  @vertex
  fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
    // Fullscreen triangle: covers viewport with 3 vertices, no vertex buffer needed
    var pos: vec2f;
    if (idx == 0u) {
      pos = vec2f(-1.0, -1.0); // Vertex 0: bottom-left (-1, -1)
    } else if (idx == 1u) {
      pos = vec2f(3.0, -1.0);  // Vertex 1: bottom-right beyond viewport (3, -1)
    } else {
      pos = vec2f(-1.0, 3.0);  // Vertex 2: top-left beyond viewport (-1, 3)
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

  /** uniform values for the shader (time, mouse).
   * resolution is auto-populated from size parameter.
   * Creates test::Uniforms struct available in shader. */
  uniforms?: RenderUniforms;

  /** input textures + samplers for the shader.
   * binds sequentially: [1]=texture, [2]=sampler, [3]=texture, [4]=sampler, ...
   * (binding 0 is reserved for uniforms) */
  inputTextures?: Array<{
    texture: GPUTexture;
    sampler: GPUSampler;
  }>;
}

/** Executes a fragment shader and returns pixel (0,0) for validation.  */
export async function testFragmentShader(
  params: FragmentTestParams,
): Promise<number[]> {
  const { textureFormat = "rgba32float" } = params;
  const data = await runFragment(params);
  const count = numComponents(textureFormat);
  return data.slice(0, count);
}

/** Test a fragment shader and return the complete rendered image for visual inspection or comparison. */
export async function testFragmentShaderImage(
  params: FragmentTestParams,
): Promise<ImageData> {
  const { textureFormat = "rgba32float", size = [1, 1] } = params;
  const texData = await runFragment(params);
  const data = imageToUint8(texData, textureFormat, size[0], size[1]);
  return {
    data: new Uint8ClampedArray(data),
    width: size[0],
    height: size[1],
    colorSpace: "srgb" as const,
  } as ImageData;
}

/**
 * Tests an animated shader at multiple time points.
 * Useful for validating that shaders change over time.
 *
 * @param params - Same as testFragmentShader, plus timePoints array
 * @returns Array of image arrays, one per time point
 */
export async function testAnimatedShader(
  params: FragmentTestParams & { timePoints: number[] },
): Promise<number[][]> {
  const { timePoints, ...baseParams } = params;
  return await Promise.all(
    timePoints.map(time =>
      testFragmentShader({
        ...baseParams,
        uniforms: { ...baseParams.uniforms, time },
      }),
    ),
  );
}

/** Compile and run a fragment shader for testing. */
async function runFragment(params: FragmentTestParams): Promise<number[]> {
  const { projectDir, device, src, conditions = {}, constants } = params;
  const { textureFormat = "rgba32float", size = [1, 1] } = params;
  const { inputTextures, uniforms = {} } = params;

  const uniformBuffer = renderUniformBuffer(device, size, uniforms);
  const virtualLibs = createUniformsVirtualLib();
  const completeSrc = src + "\n\n" + fullscreenTriangleVertex;

  const module = await compileShader({
    projectDir,
    device,
    src: completeSrc,
    conditions,
    constants,
    virtualLibs,
  });

  return await simpleRender({
    device,
    module,
    outputFormat: textureFormat,
    size,
    inputTextures,
    uniformBuffer,
  });
}

/** Convert typed data created from a gpu texture to an RGBA Uint8ClampedArray.
 *
 * (note that withTextureCopy() has already unpacked the texture data,
 * but here we convert to 8-bit RGBA for image comparison/saving)
 */
function imageToUint8(
  data: ArrayLike<number>,
  format: GPUTextureFormat,
  width: number,
  height: number,
): Uint8ClampedArray {
  const totalPixels = width * height;
  const components = numComponents(format);
  const byteSize = componentByteSize(format);
  const texelType = texelLoadType(format);

  // Already 8-bit normalized - ensure Uint8ClampedArray type
  if (byteSize === 1 && format.includes("unorm")) {
    return data instanceof Uint8ClampedArray
      ? data
      : new Uint8ClampedArray(Array.from(data));
  }

  // Float data (f32/f16) - normalize [0,1] and convert to [0,255]
  if (texelType === "f32") {
    const uint8Data = new Uint8ClampedArray(totalPixels * 4);
    for (let i = 0; i < totalPixels * components; i++) {
      uint8Data[i] = Math.round(Math.max(0, Math.min(1, data[i])) * 255);
    }
    return uint8Data;
  }

  throw new Error(`Unsupported texture format for image export: ${format}`);
}
