/**
 * Unified benchmark runner that handles both worker and standard modes
 */

import type { BenchTest } from "./Benchmark.ts";
import type { BenchmarkReport } from "./BenchmarkReport.ts";
import type { BenchConfig } from "./BenchConfig.ts";
import type { MeasureOptions } from "./mitata-util/MitataBench.ts";
import { runBenchmarks as runStandardBenchmarks, type RunBenchmarkOptions } from "./RunBenchmark.ts";
import { vanillaMitataBatch } from "./runners/VanillaMitataBatch.ts";
import { convertToWeslReports } from "./wesl/WeslReportConverter.ts";
import { workerBenchAndReport } from "./wesl/WeslWorkerBench.ts";
import type { ParserVariant } from "./wesl/BenchVariations.ts";

/** Run benchmarks with unified configuration */
export async function runBenchmarks(
  tests: BenchTest<any>[],
  config: BenchConfig,
): Promise<BenchmarkReport[]> {
  if (config.mode === 'worker') {
    return runWorkerBenchmarks(tests, config);
  } else {
    return runStandardBenchmarksUnified(tests, config);
  }
}

/** Run benchmarks in worker mode */
async function runWorkerBenchmarks(
  tests: BenchTest<any>[],
  config: BenchConfig,
): Promise<BenchmarkReport[]> {
  const reports: BenchmarkReport[] = [];
  const opts = createMeasureOptions(config);
  
  for (const test of tests) {
    // Get the original BenchTest if available (for WESL benchmarks)
    const benchTest = test.metadata?.weslBenchTest;
    if (!benchTest) {
      console.warn(
        `Skipping test ${test.name} - no BenchTest metadata for worker mode`,
      );
      continue;
    }
    
    // Extract variants from benchmark names
    const variants = new Set<string>();
    for (const benchmark of test.benchmarks) {
      const match = benchmark.name.match(/^(\w+):/);
      if (match) {
        variants.add(match[1]);
      }
    }
    
    if (config.runner === "vanilla-mitata") {
      // Use vanilla mitata batch mode
      const batchReports = await vanillaMitataBatch([test], {
        runner: "vanilla-mitata",
        time: config.time,
        useBaseline: config.useBaseline,
      });
      
      // Convert reports to WESL format
      const converted = convertToWeslReports(batchReports);
      reports.push(...converted);
    } else {
      // Use standard worker mode
      const workerReports = await workerBenchAndReport(
        [benchTest],
        opts,
        Array.from(variants) as ParserVariant[],
        config.useBaseline,
        config.runner,
        extractRunnerOptions(config),
      );
      reports.push(...workerReports);
    }
  }
  
  return reports;
}

/** Run benchmarks using the standard infrastructure */
async function runStandardBenchmarksUnified(
  tests: BenchTest<any>[],
  config: BenchConfig,
): Promise<BenchmarkReport[]> {
  // Create options for the runner
  const options: RunBenchmarkOptions = {
    runner: config.runner,
    filter: config.filter,
    showCpu: config.showCpu,
    useBaseline: config.useBaseline,
    time: config.time,
    warmupTime: config.warmupTime,
    warmupRuns: config.warmupRuns,
    iterations: config.iterations,
    cpuCounters: config.showCpu,
    observeGc: config.observeGc,
  };
  
  const results = await runStandardBenchmarks(tests, options);
  return convertToWeslReports(results);
}

/** Create MeasureOptions from config */
function createMeasureOptions(config: BenchConfig): MeasureOptions {
  return {
    min_cpu_time: config.time * 1e9, // convert seconds to nanoseconds
    cpuCounters: config.showCpu,
    observeGC: config.observeGc,
    inner_gc: config.collectGc,
  } as MeasureOptions;
}

/** Extract runner-specific options from config */
function extractRunnerOptions(config: BenchConfig): any {
  return {
    warmupTime: config.warmupTime,
    warmupRuns: config.warmupRuns,
    iterations: config.iterations,
  };
}