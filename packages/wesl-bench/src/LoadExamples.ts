import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fetchBulkTest } from "wesl-testsuite/fetch-bulk-tests";

export interface WeslSource {
  weslSrc: Record<string, string>;
  rootModule: string;
  lineCount?: number;
}

const bevyBulkTest = {
  name: "Bevy",
  baseDir: "bevy-wgsl",
  git: {
    url: "https://github.com/wgsl-tooling-wg/bevy-wgsl.git",
    revision: "84977ff025eaf8d92e56a9c35b815fae70eb4af0",
  },
};

/** Ensure bevy-wgsl fixture is available (fetches if needed) */
export async function ensureBevyFixture(fixturesDir: string): Promise<void> {
  // First check if fixture exists in wesl package (shared location)
  const weslFixturesDir = join(dirname(fixturesDir), "wesl/fixtures");
  if (existsSync(join(weslFixturesDir, "bevy-wgsl"))) {
    return; // Already available via wesl package
  }
  // Otherwise fetch to local fixtures directory
  const fixturesUrl = new URL(`file://${fixturesDir}/`);
  await fetchBulkTest(bevyBulkTest, fixturesUrl);
}

/** @return default benchmark examples (just bevy multi-file linking) */
export function loadDefaultExamples(
  fixturesDir: string,
): Record<string, WeslSource> {
  return {
    bevy_env_map: loadBevyEnvMap(fixturesDir),
  };
}

/** @return all benchmark examples including extended set */
export function loadAllExamples(
  examplesDir: string,
  fixturesDir: string,
): Record<string, WeslSource> {
  return {
    bevy_env_map: loadBevyEnvMap(fixturesDir),
    rasterize_05_fine: loadFile(examplesDir, "rasterize_05_fine.wgsl"),
    particle: loadFile(examplesDir, "particle.wgsl"),
    unity: loadFile(examplesDir, "unity_webgpu_000002B8376A5020.fs.wgsl"),
    tiny: loadFile(examplesDir, "tiny.wgsl"),
  };
}

// Files needed for environment_map.wesl (root + transitive deps)
const envMapFiles = [
  "./pbr/environment_map.wesl",
  "./pbr/mesh_view_bindings.wesl",
  "./pbr/mesh_view_types.wesl",
  "./pbr/lighting.wesl",
  "./pbr/clustered_forward.wesl",
];

/** @return bevy environment_map multi-file example */
function loadBevyEnvMap(fixturesDir: string): WeslSource {
  const bevyDir = findBevyDir(fixturesDir);
  const weslSrc: Record<string, string> = {};
  for (const file of envMapFiles) {
    const fullPath = join(bevyDir, file.slice(2)); // remove "./"
    weslSrc[file] = readFileSync(fullPath, "utf-8");
  }
  return {
    weslSrc,
    rootModule: "./pbr/environment_map.wesl",
    lineCount: totalLines(weslSrc),
  };
}

/** @return path to bevy shaders directory, checking multiple locations */
function findBevyDir(fixturesDir: string): string {
  const locations = [
    join(fixturesDir, "bevy-wgsl/src/shaders/bevy"),
    join(dirname(fixturesDir), "wesl/fixtures/bevy-wgsl/src/shaders/bevy"),
  ];
  for (const loc of locations) {
    if (existsSync(loc)) return loc;
  }
  const tried = locations.join(", ");
  const msg = `Bevy fixture not found. Tried: ${tried}. Run 'bb test' in wesl package first to fetch fixtures.`;
  throw new Error(msg);
}

/** @return source data for a single WESL file */
function loadFile(basePath: string, filename: string): WeslSource {
  const content = readFileSync(join(basePath, filename), "utf-8");
  const modulePath = `./${filename}`;
  const weslSrc = { [modulePath]: content };
  return { weslSrc, rootModule: modulePath, lineCount: totalLines(weslSrc) };
}

/** @return total lines across all source files */
function totalLines(weslSrc: Record<string, string>): number {
  return Object.values(weslSrc).reduce(
    (total, content) => total + content.split("\n").length,
    0,
  );
}
