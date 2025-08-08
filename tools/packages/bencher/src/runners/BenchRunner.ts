import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";

/** Execute benchmark with optional parameters */
export function executeBenchmark<T>(
  benchmark: BenchmarkSpec<T>,
  params?: T,
): void {
  (benchmark.fn as (params?: T) => void)(params);
}

/** Interface for benchmark execution libraries */
export interface BenchRunner {
  runBench<T = unknown>(
    benchmark: BenchmarkSpec<T>,
    options: RunnerOptions,
    params?: T,
  ): Promise<MeasuredResults[]>;
}

export interface RunnerOptions {
  /** Minimum time to run each benchmark (milliseconds) */
  minTime?: number;
  /** Maximum time to run each benchmark - ignored by mitata (milliseconds) */
  maxTime?: number;
  /** Maximum iterations per benchmark - ignored by TinyBench */
  maxIterations?: number;
  /** Warmup time before measurement (milliseconds) */
  warmupTime?: number;
  /** Warmup samples - mitata only, for reducing test time */
  warmupSamples?: number;
  /** Warmup threshold - mitata only (nanoseconds) */
  warmupThreshold?: number;
  /** Minimum samples required - mitata only */
  minSamples?: number;
  /** Observe GC events - mitata only, disabling avoids 1s wait (default: true) */
  observeGC?: boolean;
  /** Force GC after each iteration (requires --expose-gc) */
  collect?: boolean;
  /** Enable CPU performance counters (requires root access) */
  cpuCounters?: boolean;
}
