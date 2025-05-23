import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";

/** load the wesl/wgsl shader sources */
export async function loadModules(
  projectDir: string,
  baseDir: string,
  srcGlob: string,
): Promise<Record<string, string>> {
  const foundFiles = await glob(`${srcGlob}`, {
    cwd: projectDir,
    ignore: "node_modules/**",
  });
  const shaderFiles = foundFiles.map(f => path.resolve(projectDir, f));
  const promisedSrcs = shaderFiles.map(f =>
    fs.readFile(f, { encoding: "utf8" }),
  );
  const src = await Promise.all(promisedSrcs);
  if (src.length === 0) {
    throw new Error(`no WGSL/WESL files found in ${srcGlob}`);
  }
  const baseDirAbs = path.resolve(projectDir, baseDir);
  const relativePaths = shaderFiles.map(p =>
    path.relative(baseDirAbs, path.resolve(p)),
  );
  const moduleEntries = zip(relativePaths, src);
  return Object.fromEntries(moduleEntries);
}

export function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return as.map((a, i) => [a, bs[i]]);
}
