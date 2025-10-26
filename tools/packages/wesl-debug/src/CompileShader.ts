import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { LinkParams } from "wesl";
import { CompositeResolver, link, RecordResolver } from "wesl";
import {
  dependencyBundles,
  FileModuleResolver,
  readPackageJson,
} from "../../wesl-tooling/src/index.ts";
import { findWeslToml } from "../../wesl-tooling/src/LoadWeslToml.ts";

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

  const packageName = await getPackageName(projectDir);
  const libs = await dependencyBundles(
    { main: src },
    projectDir,
    packageName,
    !useSourceShaders, // include current package when testing bundles
  );

  let linkParams: Pick<LinkParams, "resolver" | "libs" | "weslSrc">;
  if (useSourceShaders) {
    // Use lazy file resolver for source shaders
    const resolver = await lazyFileResolver(projectDir, src, packageName);
    linkParams = { resolver, libs };
  } else {
    // Let linker create bundle resolvers from libs (including current package)
    linkParams = { weslSrc: { main: src }, libs };
  }

  const linked = await link({
    ...linkParams,
    rootModuleName: "main",
    virtualLibs,
    conditions,
    constants,
    packageName,
  });
  const module = linked.createShaderModule(device);

  await verifyCompilation(module);
  return module;
}

/** Create a lazy resolver that loads local shaders on-demand from the filesystem.
 * Laziness allows testing without rebuilding the current package after edits. */
async function lazyFileResolver(
  projectDir: string,
  mainSrc: string,
  packageName: string | undefined,
): Promise<CompositeResolver> {
  const mainResolver = new RecordResolver({ main: mainSrc }, packageName);
  const projectPath = fileURLToPath(projectDir);
  const tomlInfo = await findWeslToml(projectPath);
  const baseDir = path.isAbsolute(tomlInfo.resolvedRoot)
    ? tomlInfo.resolvedRoot
    : path.join(projectPath, tomlInfo.resolvedRoot);

  const fileResolver = new FileModuleResolver(baseDir, packageName);
  return new CompositeResolver([mainResolver, fileResolver]);
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
