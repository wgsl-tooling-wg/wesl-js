import type { LinkParams } from "wesl";
import { link } from "wesl";
import { dependencyBundles } from "../../wesl-tooling/src/ParseDependencies.ts";

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
  const weslSrc = { main: src };
  const libs = await dependencyBundles(weslSrc, projectDir);
  const linked = await link({
    weslSrc,
    libs,
    virtualLibs,
    conditions,
    constants,
  });
  const module = linked.createShaderModule(device);

  // Check for compilation errors
  const compilationInfo = await module.getCompilationInfo();
  const errors = compilationInfo.messages.filter(msg => msg.type === "error");
  if (errors.length > 0) {
    const errorMessages = errors
      .map(e => `${e.lineNum}:${e.linePos} ${e.message}`)
      .join("\n");
    throw new Error(`Shader compilation failed:\n${errorMessages}`);
  }

  return module;
}
