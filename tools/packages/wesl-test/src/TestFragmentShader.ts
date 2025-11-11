import { componentByteSize, numComponents, texelLoadType } from "thimbleberry";
import type { ImageData } from "vitest-image-snapshot";
import type { LinkParams } from "wesl";
import { normalizeModuleName } from "wesl";
import {
  createUniformsVirtualLib,
  fullscreenTriangleVertex,
  type RenderUniforms,
  renderUniformBuffer,
  simpleRender,
} from "wesl-gpu";
import { compileShader } from "./CompileShader.ts";
import { resolveShaderSource } from "./ShaderModuleLoader.ts";

export interface FragmentTestParams {
  /** WESL/WGSL source code for the fragment shader to test.
   * Either src or moduleName must be provided, but not both. */
  src?: string;

  /** Name of shader module to load from filesystem.
   * Supports: bare name (blur.wgsl), path (effects/blur.wgsl), or module path (package::effects::blur).
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

  /** Input textures for the shader.
   * Bindings: textures at [1..n], samplers at [n+1..n+m].
   * Binding 0 is reserved for uniforms. */
  textures?: GPUTexture[];

  /** Samplers for the input textures.
   * Must be length 1 (reused for all textures) or match textures.length exactly. */
  samplers?: GPUSampler[];

  /** Use source shaders from current package instead of built bundles.
   * Default: true for faster iteration during development. */
  useSourceShaders?: boolean;
}

export interface FragmentImageTestParams
  extends Omit<FragmentTestParams, "src" | "moduleName" | "device"> {
  /** Optional snapshot name override. If not provided, derived from shader name. */
  snapshotName?: string;
}

/** Run a fragment shader test and validate image snapshot.
 * @param device GPU device for rendering
 * @param moduleName Shader name to load - supports:
 *   - Bare name: "blur.wgsl" → resolves to shaders/blur.wgsl
 *   - Relative path: "effects/blur.wgsl" → resolves to shaders/effects/blur.wgsl
 *   - Module path: "package::effects::blur" → same resolution
 * @param opts Test parameters (size defaults to 256×256 for snapshots)
 */
export async function expectFragmentImage(
  device: GPUDevice,
  moduleName: string,
  opts: FragmentImageTestParams = {},
): Promise<void> {
  const { textureFormat = "rgba32float", size = [256, 256] } = opts;

  // Render shader image using moduleName
  const imageData = await testFragmentImage({
    ...opts,
    device,
    moduleName,
    textureFormat,
    size,
  });

  const snapshotName =
    opts.snapshotName ?? moduleNameToSnapshotName(moduleName);
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
export async function testFragment(
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
 * For snapshot testing shader files, consider using `expectFragmentImage` instead.
 *
 * @returns ImageData containing the full rendered output
 */
export async function testFragmentImage(
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

async function runFragment(params: FragmentTestParams): Promise<number[]> {
  const {
    projectDir,
    device,
    src,
    moduleName,
    conditions = {},
    constants,
    useSourceShaders,
  } = params;
  const {
    textureFormat = "rgba32float",
    size = [1, 1],
    textures,
    samplers,
    uniforms = {},
  } = params;

  // Resolve shader source from either src or moduleName
  const fragmentSrc = await resolveShaderSource(src, moduleName, projectDir);

  const uniformBuffer = renderUniformBuffer(device, size, uniforms);
  const virtualLibs = createUniformsVirtualLib();
  const completeSrc = fragmentSrc + "\n\n" + fullscreenTriangleVertex;

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
    textures,
    samplers,
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

/** Convert module path to snapshot name (e.g., "package::effects::blur" → "effects-blur") */
function moduleNameToSnapshotName(moduleName: string): string {
  const normalized = normalizeModuleName(moduleName);
  return normalized
    .replace(/^package::/, "") // Strip "package::" prefix
    .replaceAll("::", "-"); // Replace :: with -
}
