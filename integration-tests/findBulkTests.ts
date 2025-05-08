import { BulkTest, bulkTests } from "wesl-testsuite";
import { expandGlob } from "@std/fs";
import { basename, fromFileUrl, resolve } from "@std/path";

/* Vitest parallelizes per .test.ts file.
 *
 * So for testing many wgsl files more quickly we want at least as many
 * .test.ts files as there are CPU cores.
 *
 * Here we partition the load that wgsl file set and split it into
 * 16 parts, which we'll later use in 16 .test.ts runners.
 */

const communityRoot = fromFileUrl(
  new URL("../community-wgsl", import.meta.url),
);

export interface NamedPath {
  /** Test name */
  name: string;
  /** path relative to project root (package.json dir) */
  filePath: string;
}

export const allBulkTests = await findBulkTestPaths();

export async function findBulkTestPaths(): Promise<NamedPath[]> {
  const pathSets: NamedPath[] = [];
  for (const bulk of bulkTests) {
    const paths = await loadBulkSet(bulk);
    pathSets.push(...paths);
  }
  return pathSets;
}

async function loadBulkSet(bulk: BulkTest): Promise<NamedPath[]> {
  const baseDir = resolve(communityRoot, bulk.baseDir);

  const includeFiles = (bulk.include ?? []).map((f) => resolve(baseDir, f));
  const globFiles = await findGlobFiles(
    baseDir,
    bulk.globInclude ?? [],
    bulk.exclude ?? [],
  );

  return [...includeFiles, ...globFiles].map((f) => ({
    name: basename(f),
    filePath: f,
  }));
}

async function findGlobFiles(
  baseDir: string,
  globs: string[],
  exclude: string[],
): Promise<string[]> {
  const skip = exclude ?? [];
  const filePaths: string[] = [];
  for (const g of globs) {
    const entries = await Array.fromAsync(expandGlob(g, {
      root: baseDir,
      exclude: ["node_modules/**"],
    }));
    entries.map((e) => e.path).filter((p) => !skip.some((s) => p.includes(s)))
      .forEach((p) => {
        filePaths.push(p);
      });
  }

  return filePaths;
}
