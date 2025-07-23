import fs from "node:fs/promises";
import path from "node:path";
import type { BenchTest } from "./WeslBenchmarks.ts";

/**
 * Load WESL benchmark files for testing
 */
export async function loadWeslFiles(): Promise<BenchTest[]> {
  const examplesDir = "./src/wesl-examples";
  const reduceBuffer = await loadWeslBench(
    "reduceBuffer",
    examplesDir,
    "./reduceBuffer.wgsl",
  );
  const particle = await loadWeslBench(
    "particle",
    examplesDir,
    "./particle.wgsl",
  );
  const rasterize = await loadWeslBench(
    "rasterize",
    examplesDir,
    "./rasterize_05_fine.wgsl",
  );
  const boat = await loadWeslBench(
    "unity_webgpu_0000026E5689B260",
    examplesDir,
    "./unity_webgpu_000002B8376A5020.fs.wgsl",
  );
  const imports_only = await loadWeslBench(
    "imports_only",
    examplesDir,
    "./imports_only.wgsl",
  );
  const bevy_deferred_lighting = await loadWeslBench(
    "bevy_deferred_lighting",
    `${examplesDir}/bevy`,
    "./bevy_generated_deferred_lighting.wgsl",
  );

  return [
    reduceBuffer,
    particle,
    rasterize,
    boat,
    imports_only,
    bevy_deferred_lighting,
  ];
}

async function loadWeslBench(
  name: string,
  cwd: string,
  mainFile: string,
  extraFiles: string[] = [],
): Promise<BenchTest> {
  const files = new Map<string, string>();
  const addFile = async (p: string) =>
    files.set(p, await fs.readFile(path.join(cwd, p), { encoding: "utf8" }));

  await addFile(mainFile);
  for (const filePath of extraFiles) {
    await addFile(filePath);
  }
  return { name, mainFile, files };
}
