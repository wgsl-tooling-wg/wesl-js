import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import { findWeslToml } from "./LoadWeslToml.ts";

/**
 * Load the wesl/wgsl shader sources.
 *
 * If baseDir or srcGlob are not provided, this function will attempt to read
 * configuration from wesl.toml in the projectDir. If no wesl.toml exists,
 * default values will be used.
 *
 * @param projectDir The project directory (typically cwd or directory containing package.json)
 * @param baseDir Optional base directory for shaders (overrides wesl.toml if provided)
 * @param srcGlob Optional glob pattern for shader files (overrides wesl.toml if provided)
 */
export async function loadModules(
  projectDir: string,
  baseDir?: string,
  srcGlob?: string,
): Promise<Record<string, string>> {
  // If baseDir or srcGlob not provided, load from wesl.toml
  let resolvedBaseDir: string;
  let resolvedSrcGlob: string;

  if (!baseDir || !srcGlob) {
    const tomlInfo = await findWeslToml(projectDir);
    resolvedBaseDir = baseDir ?? tomlInfo.resolvedWeslRoot;
    resolvedSrcGlob = srcGlob ?? tomlInfo.toml.weslFiles[0]; // Use first glob pattern
  } else {
    resolvedBaseDir = baseDir;
    resolvedSrcGlob = srcGlob;
  }

  const foundFiles = await glob(`${resolvedSrcGlob}`, {
    cwd: projectDir,
    ignore: "node_modules/**",
  });
  const shaderFiles = foundFiles.map(f => path.resolve(projectDir, f));
  const promisedSrcs = shaderFiles.map(f =>
    fs.readFile(f, { encoding: "utf8" }),
  );
  const src = await Promise.all(promisedSrcs);
  if (src.length === 0) {
    throw new Error(`no WGSL/WESL files found in ${resolvedSrcGlob}`);
  }
  const baseDirAbs = path.resolve(projectDir, resolvedBaseDir);
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
