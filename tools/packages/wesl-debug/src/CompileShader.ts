import { fileURLToPath } from "node:url";
import type { LinkParams } from "wesl";
import { link, noSuffix } from "wesl";
import {
  dependencyBundles,
  readPackageJson,
} from "../../wesl-tooling/src/index.ts";
import { loadModules } from "../../wesl-tooling/src/LoadModules.ts";

export interface CompileShaderParams {
  /** The project directory, used for resolving dependencies. */
  projectDir: string;

  /** The GPUDevice to use for shader compilation. */
  device: GPUDevice;

  /** The WGSL/WESL shader source code. */
  src: string;

  /** Optional conditions for shader compilation. */
  conditions?: LinkParams["conditions"];

  /** Optional constants for shader compilation. */
  constants?: LinkParams["constants"];

  /** Optional virtual libraries to include in the shader. */
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
 * Compiles a single WESL shader source string into a GPUShaderModule for testing
 * with automatic package detection.
 *
 * Parses the shader source to find references to wesl packages, and
 * then searches installed npm packages to find the appropriate npm package
 * bundle to include in the link.
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
  // Check for compilation errors
  const compilationInfo = await module.getCompilationInfo();
  const errors = compilationInfo.messages.filter(msg => msg.type === "error");
  if (errors.length > 0) {
    const errorMessages = errors
      .map(e => `${e.lineNum}:${e.linePos} ${e.message}`)
      .join("\n");
    throw new Error(`Shader compilation failed:\n${errorMessages}`);
  }
}
