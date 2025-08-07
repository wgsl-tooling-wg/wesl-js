import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";

/** Execute a benchmark function with proper parameter handling */
export function executeBenchmark<T>(
  benchmark: BenchmarkSpec<T>,
  params?: T,
): void {
  (benchmark.fn as (params?: T) => void)(params);
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

  /** Force a garbage collection after each iteration (requires --expose-gc flag). */
  collect?: boolean;
}
