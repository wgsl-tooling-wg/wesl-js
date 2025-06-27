import fs from "node:fs/promises";
import path from "node:path";
import type { BenchTest } from "../bin/bench.ts";

export async function loadBenchmarkFiles(): Promise<BenchTest[]> {
  const examplesDir = "./src/examples";
  const reduceBuffer = await loadBench(
    "reduceBuffer",
    examplesDir,
    "./reduceBuffer.wgsl",
  );
  const particle = await loadBench("particle", examplesDir, "./particle.wgsl");
  const rasterize = await loadBench(
    "rasterize",
    examplesDir,
    "./rasterize_05_fine.wgsl",
  );
  const boat = await loadBench(
    "unity_webgpu_0000026E5689B260",
    examplesDir,
    "./unity_webgpu_000002B8376A5020.fs.wgsl",
  );
  const imports_only = await loadBench(
    "imports_only",
    examplesDir,
    "./imports_only.wgsl",
  );
  const bevy_deferred_lighting = await loadBench(
    "bevy_deferred_lighting",
    "./src/examples/bevy",
    "./bevy_generated_deferred_lighting.wgsl",
  );
  const bevy_linking = await loadBench(
    "bevy_linking",
    "./src/examples/naga_oil_example",
    "./pbr.wgsl",
    [
      "./clustered_forward.wgsl",
      "./mesh_bindings.wgsl",
      "./mesh_types.wgsl",
      "./mesh_vertex_output.wgsl",
      "./mesh_view_bindings.wgsl",
      "./mesh_view_types.wgsl",
      "./pbr_bindings.wgsl",
      "./pbr_functions.wgsl",
      "./pbr_lighting.wgsl",
      "./pbr_types.wgsl",
      "./shadows.wgsl",
      "./utils.wgsl",
    ],
  );
  return [
    reduceBuffer,
    // particle,
    // rasterize,
    // boat,
    // imports_only,
    // bevy_deferred_lighting,
    // bevy_linking,
  ];
}

async function loadBench(
  name: string,
  cwd: string,
  mainFile: string,
  extraFiles: string[] = [],
): Promise<BenchTest> {
  const files = new Map<string, string>();
  const addFile = async (p: string) =>
    files.set(p, await fs.readFile(path.join(cwd, p), { encoding: "utf8" }));

  await addFile(mainFile);
  for (const path of extraFiles) {
    await addFile(path);
  }
  return { name, mainFile, files };
}
