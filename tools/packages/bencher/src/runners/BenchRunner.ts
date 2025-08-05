import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";

/** Execute a benchmark function with proper parameter handling */
export function executeBenchmark<T>(
  benchmark: BenchmarkSpec<T>,
  params?: T,
): void {
  if (benchmark.fn.length === 0) {
    // No-args function
    (benchmark.fn as () => void)();
  } else if (params !== undefined) {
    // Function expects params from setup
    (benchmark.fn as (params: T) => void)(params);
  } else {
    // Function expects params but none provided
    throw new Error(
      `Benchmark "${benchmark.name}" expects parameters but none were provided. ` +
        `Add a setup function to the benchmark group to provide data.`,
    );
  }
}

/** Implemented by benchmark libraries to run individual benchmark tasks */
export interface BenchRunner {
  runBench<T = unknown>(
    benchmark: BenchmarkSpec<T>,
    options: RunnerOptions,
    params?: T,
  ): Promise<MeasuredResults[]>;
}

export interface RunnerOptions {
  /** Minimum time in milliseconds to run each benchmark. */
  minTime?: number;

  /** Maximum time in milliseconds to run each benchmark (ignored by mitata). */
  maxTime?: number;

  /** Maximum number of iterations to run for each benchmark. (ignored by TinyBench) */
  maxIterations?: number;

  /** Warmup time to prepare the JS engine before measurement. */
  warmupTime?: number;

  /** Number of warmup samples (mitata only, for reducing unit test time). */
  warmupSamples?: number;

  /** Warmup threshold in nanoseconds - below this threshold, warmup runs are performed (mitata only). */
  warmupThreshold?: number;

  /** Minimum number of samples required (mitata only, for reducing unit test time). */
  minSamples?: number;

  /** Whether to observe GC events (mitata only). Disabling this avoids a 1-second wait. Default: true */
  observeGC?: boolean;
}
