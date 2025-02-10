import { glob } from "glob";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BulkTest, bulkTests } from "wesl-testsuite";
import { NamedPath } from "./testWgslFiles.ts";

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
    shortPath: f
      .replaceAll(path.sep, path.posix.sep)
      .replaceAll("-", "_")
      .replace(/\.(vert|frag|fs|vs|cs)/, "_$1"),
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
  const cwd = process.cwd();
  const skip = exclude ?? [];
  try {
    process.chdir(fullBaseDir);
    const futurePaths =
      globs?.map(g => glob(g, { ignore: ["node_modules/**"] })) ?? [];
    const pathSets = await Promise.all(futurePaths);
    const filePaths = pathSets.flat();
    return filePaths.filter(p => !skip.some(s => p.includes(s)));
  } finally {
    process.chdir(cwd);
  }
}
