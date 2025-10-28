import { normalizeModuleName } from "wesl";
import { createProjectResolver } from "./CompileShader.ts";

/** Validates that exactly one of src or moduleName is provided.
 * @throws Error if neither or both are provided */
export function validateSourceParams(
  src?: string,
  moduleName?: string,
): void {
  if (!src && !moduleName) {
    throw new Error("Either src or moduleName must be provided");
  }
  if (src && moduleName) {
    throw new Error("Cannot provide both src and moduleName");
  }
}

/** Loads shader source from module name using filesystem resolver.
 * @param moduleName Shader module name (bare name, path, or module path)
 * @param projectDir Project directory for module resolution
 * @returns Shader source code
 */
export async function loadShaderSourceFromModule(
  moduleName: string,
  projectDir?: string,
): Promise<string> {
  const resolver = await createProjectResolver(projectDir);
  const normalizedName = normalizeModuleName(moduleName);
  const ast = resolver.resolveModule(normalizedName);
  if (!ast) throw new Error(`Could not resolve module: ${moduleName}`);
  return ast.srcModule.src;
}

/** Resolves shader source from either inline src or moduleName.
 * @param src Inline shader source code
 * @param moduleName Shader module name to load from filesystem
 * @param projectDir Project directory for module resolution
 * @returns Shader source code
 */
export async function resolveShaderSource(
  src?: string,
  moduleName?: string,
  projectDir?: string,
): Promise<string> {
  validateSourceParams(src, moduleName);
  return moduleName
    ? await loadShaderSourceFromModule(moduleName, projectDir)
    : src!;
}
