import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizePackageName, type WeslBundle } from "wesl";
import {
  dependencyBundles,
  findWeslToml,
  loadModules,
  readPackageJson,
  resolveProjectDir,
} from "wesl-tooling";

export interface ProjectInfo {
  weslSrc: Record<string, string>;
  rootModuleName: string;
  packageName: string;
  libs: WeslBundle[];
}

/** Load all shader modules for the project containing filePath. Returns null if not in a project. */
export async function loadProject(
  filePath: string,
): Promise<ProjectInfo | null> {
  try {
    const projectDir = fileURLToPath(await resolveProjectDir(filePath));
    const tomlInfo = await findWeslToml(projectDir);
    const packageName = await getPackageName(projectDir);
    const weslSrc = await loadModules(projectDir);
    const virtualLibs = ["test"]; // test:: is provided by wgsl-play at runtime
    const rawLibs = await dependencyBundles(
      weslSrc,
      projectDir,
      packageName,
      false,
      virtualLibs,
    );
    const libs = rawLibs.filter(Boolean);

    const shaderRootAbs = path.resolve(projectDir, tomlInfo.resolvedRoot);
    const rootModuleName = path
      .relative(shaderRootAbs, filePath)
      .replace(/\\/g, "/");

    return { weslSrc, rootModuleName, packageName, libs };
  } catch {
    return null;
  }
}

/** Read package name from package.json, sanitized for WESL identifiers. */
async function getPackageName(projectDir: string): Promise<string> {
  try {
    const pkg = await readPackageJson(projectDir);
    return sanitizePackageName(pkg.name as string);
  } catch {
    return path.basename(projectDir);
  }
}
