import { componentByteSize, numComponents, texelLoadType } from "thimbleberry";
import type { ImageData } from "vitest-image-snapshot";
import type { LinkParams } from "wesl";
import { normalizeModuleName } from "wesl";
import { compileShader, createProjectResolver } from "./CompileShader.ts";
import {
  createUniformsVirtualLib,
  type RenderUniforms,
  renderUniformBuffer,
} from "./RenderUniforms.ts";
import { simpleRender } from "./SimpleRender.ts";

export const fullscreenTriangleVertex = `
  @vertex
  fn vs_main(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
    // Covers viewport with 3 vertices, no vertex buffer needed
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
  /** WESL/WGSL source code for the fragment shader to test. */
  src: string;

  /** Project directory for resolving shader dependencies.
   * Allows the shader to import from npm shader libraries.
   * Optional: defaults to searching upward from cwd for package.json or wesl.toml.
   * Typically use `import.meta.url`. */
  projectDir?: string;

  /** GPU device for running the tests.
   * Typically use `getGPUDevice()` from wesl-debug. */
  device: GPUDevice;

  /** Texture format for the output texture. Default: "rgba32float" */
  textureFormat?: GPUTextureFormat;

  /** Size of the output texture. Default: [1, 1] for simple color tests.
   * Use [2, 2] for derivative tests (forms a complete 2x2 quad for dpdx/dpdy). */
  size?: [width: number, height: number];

  /** Flags for conditional compilation to test shader specialization.
   * Useful for testing `@if` statements in the shader. */
  conditions?: LinkParams["conditions"];

  /** Constants for shader compilation.
   * Injects host-provided values via the `constants::` namespace. */
  constants?: LinkParams["constants"];

  /** Uniform values for the shader (time, mouse).
   * Resolution is auto-populated from the size parameter.
   * Creates test::Uniforms struct available in the shader. */
  uniforms?: RenderUniforms;

  /** Input textures and samplers for the shader.
   * Bound sequentially: [1]=texture, [2]=sampler, [3]=texture, [4]=sampler, etc.
   * Binding 0 is reserved for uniforms. */
  inputTextures?: Array<{
    texture: GPUTexture;
    sampler: GPUSampler;
  }>;

  /** Use source shaders from current package instead of built bundles.
   * Default: true for faster iteration during development. */
  useSourceShaders?: boolean;
}

export interface FragmentImageTestParams
  extends Omit<FragmentTestParams, "src" | "device"> {
  /** Optional snapshot name override. If not provided, derived from shader name. */
  snapshotName?: string;
}

/** Convert module path to snapshot name (e.g., "package::effects::blur" → "effects-blur") */
function moduleNameToSnapshotName(moduleName: string): string {
  const normalized = normalizeModuleName(moduleName);
  return normalized
    .replace(/^package::/, "") // Strip "package::" prefix
    .replaceAll("::", "-"); // Replace :: with -
}

/** Load shader source from module name using resolver.
 * Supports: bare name (blur), file path (effects/blur.wgsl), or module path (package::effects::blur). */
async function loadShaderSourceFromModule(
  moduleName: string,
  projectDir?: string,
): Promise<string> {
  const resolver = await createProjectResolver(projectDir);
  const normalizedName = normalizeModuleName(moduleName);
  const ast = resolver.resolveModule(normalizedName);
  if (!ast) throw new Error(`Could not resolve module: ${moduleName}`);
  return ast.srcModule.src;
}

/** Run a fragment shader test and validate image snapshot.
 * @param device GPU device for rendering
 * @param name Shader name to load - supports:
 *   - Bare name: "blur.wgsl" → resolves to shaders/blur.wgsl
 *   - Relative path: "effects/blur.wgsl" → resolves to shaders/effects/blur.wgsl
 *   - Module path: "package::effects::blur" → same resolution
 * @param opts Test parameters (size defaults to 256×256 for snapshots)
 */
export async function expectFragmentImage(
  device: GPUDevice,
  name: string,
  opts: FragmentImageTestParams = {},
): Promise<void> {
  const { textureFormat = "rgba32float", size = [256, 256] } = opts;

  // Load shader source from module name (testFragmentShaderImage will append vertex shader)
  const fragmentSrc = await loadShaderSourceFromModule(name, opts.projectDir);

  // Render shader image
  const imageData = await testFragmentShaderImage({
    ...opts,
    device,
    src: fragmentSrc,
    projectDir: opts.projectDir,
    textureFormat,
    size,
  });

  const snapshotName = opts.snapshotName ?? moduleNameToSnapshotName(name);
  const { imageMatcher } = await import("vitest-image-snapshot");
  imageMatcher();
  const { expect } = await import("vitest");
  await expect(imageData).toMatchImage(snapshotName);
}

/**
 * Renders a fragment shader and returns pixel (0,0) color values for validation.
 *
 * Useful for simple color tests where you only need to check a single pixel result.
 *
 * @returns Array of color component values from pixel (0,0)
 */
export async function testFragmentShader(
  params: FragmentTestParams,
): Promise<number[]> {
  const { textureFormat = "rgba32float" } = params;
  const data = await runFragment(params);
  const count = numComponents(textureFormat);
  return data.slice(0, count);
}

/**
 * Renders a fragment shader and returns the complete rendered image.
 *
 * Useful for image snapshot testing or when you need to validate the entire output.
 *
 * @returns ImageData containing the full rendered output
 */
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

/** Tests a shader at multiple time points to validate animation. */
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

async function runFragment(params: FragmentTestParams): Promise<number[]> {
  const {
    projectDir,
    device,
    src,
    conditions = {},
    constants,
    useSourceShaders,
  } = params;
  const {
    textureFormat = "rgba32float",
    size = [1, 1],
    inputTextures,
    uniforms = {},
  } = params;

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
    useSourceShaders,
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

/** Convert texture data to RGBA Uint8ClampedArray for image comparison. */
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

  if (byteSize === 1 && format.includes("unorm")) {
    return data instanceof Uint8ClampedArray
      ? data
      : new Uint8ClampedArray(Array.from(data));
  }

  if (texelType === "f32") {
    const uint8Data = new Uint8ClampedArray(totalPixels * 4);
    for (let i = 0; i < totalPixels * components; i++) {
      uint8Data[i] = Math.round(Math.max(0, Math.min(1, data[i])) * 255);
    }
    return uint8Data;
  }

  throw new Error(`Unsupported texture format for image export: ${format}`);
}
