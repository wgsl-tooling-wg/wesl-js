import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";

export interface RunnerOptions {
  minTime?: number; // minimum time to run each benchmark
}

export interface BenchRunner {
  runBench(
    benchmarks: BenchmarkSpec,
    options: RunnerOptions,
  ): Promise<MeasuredResults[]>;
}
