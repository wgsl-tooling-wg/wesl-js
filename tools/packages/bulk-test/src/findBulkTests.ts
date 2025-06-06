import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import { type BulkTest, bulkTests } from "wesl-testsuite";
import type { NamedPath } from "./testWgslFiles.ts";

/* Vitest parallelizes per .test.ts file.
 *
 * So for testing many wgsl files more quickly we want at least as many
 * .test.ts files as there are CPU cores.
 *
 * Here we partition the load that wgsl file set and split it into
 * 16 parts, which we'll later use in 16 .test.ts runners.
 */

// get the path to the community-wgsl directory
const srcDir = dirname(fileURLToPath(import.meta.url));
const communityRoot = path.join(
  srcDir,
  "..",
  "..",
  "..",
  "..",
  "community-wgsl",
);

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
  const baseDir = path.join(communityRoot, bulk.baseDir);
  const includeFiles = bulk.include ?? [];
  const globFiles = await findGlobFiles(
    baseDir,
    bulk.globInclude,
    bulk.exclude,
  );
  const relativePaths: string[] = [...includeFiles, ...globFiles];
  const namePaths: NamedPath[] = relativePaths.map(f => ({
    name: f,
    filePath: path.join(baseDir, f),
  }));
  return namePaths;
}

async function findGlobFiles(
  baseDir: string,
  globs: string[] | undefined,
  exclude: string[] | undefined,
): Promise<string[]> {
  const fullBaseDir = path.resolve(baseDir);
  const skip = exclude ?? [];
  const futurePaths =
    globs?.map(g =>
      glob(g, { ignore: ["node_modules/**"], cwd: fullBaseDir }),
    ) ?? [];
  const pathSets = await Promise.all(futurePaths);
  const filePaths = pathSets.flat();
  return filePaths.filter(p => !skip.some(s => p.includes(s)));
}
