import type { BenchConfig } from "./BenchConfig.ts";
import type { BenchTest } from "./Benchmark.ts";
import type { BenchmarkReport } from "./BenchmarkReport.ts";
import type { MeasureOptions } from "./mitata-util/MitataBench.ts";
import {
  type RunBenchmarkOptions,
  runBenchmarks as runStandardBenchmarks,
} from "./RunBenchmark.ts";

/** Function to handle worker mode benchmarks */
export type WorkerBenchmarkHandler = (
  tests: BenchTest<any>[],
  config: BenchConfig,
) => Promise<BenchmarkReport[]>;

/** Function to convert benchmark results to reports */
export type ReportConverter = (results: any[]) => BenchmarkReport[];

export interface UnifiedRunnerOptions {
  /** Handler for worker mode benchmarks */
  workerHandler?: WorkerBenchmarkHandler;
  /** Converter for benchmark reports */
  reportConverter?: ReportConverter;
}

/** Run benchmarks with unified configuration */
export async function runBenchmarks(
  tests: BenchTest<any>[],
  config: BenchConfig,
  options: UnifiedRunnerOptions = {},
): Promise<BenchmarkReport[]> {
  if (config.mode === "worker") {
    if (!options.workerHandler) {
      throw new Error("Worker handler required for worker mode");
    }
    return options.workerHandler(tests, config);
  } else {
    return runStandardBenchmarksUnified(tests, config, options.reportConverter);
  }
}

/** Run benchmarks using the standard infrastructure */
async function runStandardBenchmarksUnified(
  tests: BenchTest<any>[],
  config: BenchConfig,
  reportConverter?: ReportConverter,
): Promise<BenchmarkReport[]> {

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

  // Use provided converter or return results as-is
  if (reportConverter) {
    return reportConverter(results);
  }

  // Default: treat results as BenchmarkReport[]
  return results as unknown as BenchmarkReport[];
}

/** Create MeasureOptions from config */
export function createMeasureOptions(config: BenchConfig): MeasureOptions {
  return {
    min_cpu_time: config.time * 1e9, // convert seconds to nanoseconds
    cpuCounters: config.showCpu,
    observeGC: config.observeGc,
    inner_gc: config.collectGc,
  } as MeasureOptions;
}

/** Extract runner-specific options from config */
export function extractRunnerOptions(config: BenchConfig): any {
  return {
    warmupTime: config.warmupTime,
    warmupRuns: config.warmupRuns,
    iterations: config.iterations,
  };
}
