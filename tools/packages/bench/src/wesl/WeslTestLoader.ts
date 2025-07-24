import type { BenchConfig } from "../BenchConfig.ts";
import type { BenchmarkSpec, BenchTest } from "../Benchmark.ts";
import { loadSimpleFiles, loadSimpleTest } from "./LoadSimpleTest.ts";
import type { BenchTest as WeslBenchTest } from "./WeslBenchmarks.ts";
import { setupWeslBenchmarks } from "./WeslBenchmarks.ts";
import { getWeslExtension } from "./WeslConfig.ts";

export async function loadWeslTests(
  config: BenchConfig,
): Promise<BenchTest<any>[]> {
  const weslExt = getWeslExtension(config);

  if (weslExt.testSource === "simple") {
    return loadSimpleBenchTests(config, weslExt.simpleTestName);
  } else {
    return setupWeslBenchmarks(
      config.filter,
      weslExt.variants,
      config.useBaseline,
    );
  }
}

/** Load simple benchmark tests */
async function loadSimpleBenchTests(
  config: BenchConfig,
  simpleTestName?: string,
): Promise<BenchTest<any>[]> {
  if (!simpleTestName) {
    throw new Error("Simple test name required for simple test source");
  }

  // Load the simple test function and files
  const { fn, name } = loadSimpleTest(simpleTestName);
  const weslSrc = await loadSimpleFiles();

  // Create benchmark spec for simple test
  const benchmarkSpec: BenchmarkSpec<Record<string, string>> = {
    name,
    fn: () => fn(weslSrc),
    params: weslSrc,
  };

  // If baseline is requested, use the same function
  if (config.useBaseline) {
    benchmarkSpec.baseline = {
      fn: () => fn(weslSrc),
    };
  }

  // Create metadata for reporting
  const files = new Map(Object.entries(weslSrc));
  const weslBenchTest: WeslBenchTest = {
    name,
    mainFile: "N/A",
    files,
  };

  // Create a single benchmark test
  const benchTest: BenchTest<Record<string, string>> = {
    name,
    setup: () => weslSrc,
    benchmarks: [benchmarkSpec],
    metadata: {
      weslBenchTest,
      linesOfCode: calculateLinesOfCode(weslSrc),
    },
  };

  return [benchTest];
}

function calculateLinesOfCode(weslSrc: Record<string, string>): number {
  return Object.values(weslSrc)
    .map(code => code.split("\n").length)
    .reduce((a, b) => a + b, 0);
}
