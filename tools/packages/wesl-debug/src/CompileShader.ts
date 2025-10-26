import { fileURLToPath } from "node:url";
import type { LinkParams } from "wesl";
import { link, noSuffix } from "wesl";
import {
  dependencyBundles,
  readPackageJson,
} from "../../wesl-tooling/src/index.ts";
import { loadModules } from "../../wesl-tooling/src/LoadModules.ts";

export interface CompileShaderParams {
  /** Project directory for resolving shader dependencies.
   * Used to locate installed npm shader libraries. */
  projectDir: string;

  /** GPU device to use for shader compilation. */
  device: GPUDevice;

  /** WESL/WGSL shader source code to compile. */
  src: string;

  /** Conditions for conditional compilation.
   * Used to control `@if` directives in the shader. */
  conditions?: LinkParams["conditions"];

  /** Constants for shader compilation.
   * Injects host-provided values via the `constants::` namespace. */
  constants?: LinkParams["constants"];

  /** Virtual libraries to include in the shader.
   * Allows dynamic generation of shader code at runtime. */
  virtualLibs?: LinkParams["virtualLibs"];

  /** Use source shaders from current package instead of built bundles.
   * Default: true for faster iteration during development.
   * Set to false or use TEST_BUNDLES=true environment variable to test built bundles.
   *
   * Precedence: explicit parameter > TEST_BUNDLES env var > default (true)
   */
  useSourceShaders?: boolean;
}

/**
 * Compiles a WESL shader source string into a GPUShaderModule with automatic dependency resolution.
 *
 * Parses the shader source to detect references to shader packages, then automatically
 * includes the required npm package bundles. By default, loads source shaders from the
 * current package for fast iteration without requiring rebuilds.
 *
 * @returns Compiled GPUShaderModule ready for use in render or compute pipelines
 * @throws Error if shader compilation fails with compilation error details
 */
export async function compileShader(
  params: CompileShaderParams,
): Promise<GPUShaderModule> {
  const { projectDir, device, src, conditions, constants, virtualLibs } =
    params;
  const { useSourceShaders = !process.env.TEST_BUNDLES } = params;

  const localSources = useSourceShaders
    ? await loadLocalSources(projectDir)
    : {};
  const weslSrc = { main: src, ...localSources };

  const libs = await dependencyBundles(weslSrc, projectDir);
  const packageName =
    Object.keys(localSources).length > 0
      ? await getPackageName(projectDir)
      : undefined;

  const linked = await link({
    weslSrc,
    rootModuleName: "main",
    libs,
    virtualLibs,
    conditions,
    constants,
    packageName,
  });
  const module = linked.createShaderModule(device);

  await verifyCompilation(module);
  return module;
}

/** Load local shader sources with extensions stripped (utils.wesl -> utils). */
async function loadLocalSources(
  projectDir: string,
): Promise<Record<string, string>> {
  try {
    // loadModules needs a filesystem path, convert from file:// URL
    const projectPath = fileURLToPath(projectDir);
    const sources = await loadModules(projectPath);
    return Object.fromEntries(
      Object.entries(sources).map(([path, content]) => [
        noSuffix(path),
        content,
      ]),
    );
  } catch {
    return {}; // No local shaders found - acceptable
  }
}

/** Read package name from package.json, normalized for WGSL identifiers. */
async function getPackageName(projectDir: string): Promise<string | undefined> {
  try {
    const pkg = await readPackageJson(projectDir);
    const name = pkg.name as string;
    return name.replace(/-/g, "_");
  } catch {
    return undefined;
  }
}

/** Verify shader compilation succeeded, throw on errors. */
async function verifyCompilation(module: GPUShaderModule): Promise<void> {
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter(msg => msg.type === "error");
  if (errors.length > 0) {
    const messages = errors
      .map(e => `${e.lineNum}:${e.linePos} ${e.message}`)
      .join("\n");
    throw new Error(`Shader compilation failed:\n${messages}`);
  }
}
