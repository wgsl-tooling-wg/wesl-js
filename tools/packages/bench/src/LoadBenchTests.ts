import type { BenchTest, BenchmarkSpec } from "./Benchmark.ts";
import type { BenchConfig } from "./BenchConfig.ts";
import { loadSimpleTest, loadSimpleFiles } from "./wesl/LoadSimpleTest.ts";
import { setupWeslBenchmarks } from "./wesl/WeslBenchmarks.ts";
import type { BenchTest as WeslBenchTest } from "./wesl/WeslBenchmarks.ts";

/** Load benchmark tests based on configuration */
export async function loadBenchTests(config: BenchConfig): Promise<BenchTest<any>[]> {
  if (config.testSource === 'simple') {
    return loadSimpleBenchTests(config);
  } else {
    return setupWeslBenchmarks(config.filter, config.variants, config.useBaseline);
  }
}

/** Load simple benchmark tests */
async function loadSimpleBenchTests(config: BenchConfig): Promise<BenchTest<any>[]> {
  if (!config.simpleTestName) {
    throw new Error("Simple test name required for simple test source");
  }
  
  // Load the simple test function and files
  const { fn, name } = loadSimpleTest(config.simpleTestName);
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
    files 
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