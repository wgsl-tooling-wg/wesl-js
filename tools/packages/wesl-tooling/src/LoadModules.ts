import { glob } from "glob";
import fs from "node:fs/promises";
import path from "node:path";

/** load the wesl/wgsl shader sources */
export async function loadModules(baseDir:string, srcGlob:string): Promise<Record<string, string>> {
  const shaderFiles = await glob(`${srcGlob}`, {
    ignore: "node_modules/**",
  });
  const promisedSrcs = shaderFiles.map(f =>
    fs.readFile(f, { encoding: "utf8" }),
  );
  const src = await Promise.all(promisedSrcs);
  const relativePaths = shaderFiles.map(p => path.relative(baseDir, p));
  const moduleEntries = zip(relativePaths, src);
  return Object.fromEntries(moduleEntries);
}

export function zip<A, B>(as: A[], bs: B[]): [A, B][] {
  return as.map((a, i) => [a, bs[i]]);
}