import { componentByteSize, numComponents, texelLoadType } from "thimbleberry";
import type { ImageData } from "vitest-image-snapshot";
import { normalizeModuleName } from "wesl";
import {
  type FragmentRenderParams,
  runFragment as runFragmentCore,
  type WeslOptions,
} from "wesl-gpu";
import { resolveShaderContext } from "./CompileShader.ts";
import { resolveShaderSource } from "./ShaderModuleLoader.ts";
import { importImageSnapshot, importVitest } from "./VitestImport.ts";

export interface FragmentTestParams extends WeslOptions, FragmentRenderParams {
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
  const { imageMatcher } = await importImageSnapshot();
  imageMatcher();
  const { expect } = await importVitest();
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

/** Convert module path to snapshot name (e.g., "package::effects::blur" → "effects-blur") */
function moduleNameToSnapshotName(moduleName: string): string {
  const normalized = normalizeModuleName(moduleName);
  return normalized
    .replace(/^package::/, "") // Strip "package::" prefix
    .replaceAll("::", "-"); // Replace :: with -
}

async function runFragment(params: FragmentTestParams): Promise<number[]> {
  const { projectDir, src, moduleName, useSourceShaders } = params;

  // Resolve shader source from either src or moduleName
  const fragmentSrc = await resolveShaderSource(src, moduleName, projectDir);

  // Resolve context (libs, resolver, packageName) from project
  // Note: "test" virtualLib is provided by wesl-gpu for test::Uniforms
  const ctx = await resolveShaderContext({
    src: fragmentSrc,
    projectDir,
    useSourceShaders,
    virtualLibNames: ["test"],
  });

  // Use shared runFragment with resolved source and context
  return runFragmentCore({
    ...params,
    src: fragmentSrc,
    libs: params.libs ?? ctx.libs,
    resolver: params.resolver ?? ctx.resolver,
    packageName: params.packageName ?? ctx.packageName,
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
