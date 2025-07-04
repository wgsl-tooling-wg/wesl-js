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

  // Normalize Windows paths and line endings
  const normalPaths = relativePaths.map(p => p.replace(/\\/g, "/"));
  const normalSrc = src.map(s => s.replace(/\r\n/g, "\n"));

  const moduleEntries = zip(normalPaths, normalSrc);
  return Object.fromEntries(moduleEntries);
}

export function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return as.map((a, i) => [a, bs[i]]);
}
