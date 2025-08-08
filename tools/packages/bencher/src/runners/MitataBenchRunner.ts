import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import {
  type MeasureOptions,
  mitataBench,
} from "../mitata-util/MitataBench.ts";
import type { BenchRunner, RunnerOptions } from "./BenchRunner.ts";
import { executeBenchmark } from "./BenchRunner.ts";
import { msToNs } from "./RunnerUtils.ts";

/** Runner using mitata benchmark library */
export class MitataBenchRunner implements BenchRunner {
  async runBench<T = unknown>(
    benchmark: BenchmarkSpec<T>,
    options: RunnerOptions,
    params?: T,
  ): Promise<MeasuredResults[]> {
    const { minTime, warmupTime, maxIterations, observeGC, collect } = options;
    const { warmupSamples, warmupThreshold, minSamples } = options;

    const opts: MeasureOptions = { args: {}, warmupTime };
    if (minTime) opts.min_cpu_time = minTime * msToNs;
    if (maxIterations) opts.max_samples = maxIterations;
    if (warmupSamples !== undefined) opts.warmup_samples = warmupSamples;
    if (warmupThreshold !== undefined) opts.warmup_threshold = warmupThreshold;
    if (minSamples !== undefined) opts.min_samples = minSamples;
    opts.observeGC = observeGC;
    opts.collect = collect;

    const result = await mitataBench(
      () => executeBenchmark(benchmark, params),
      benchmark.name,
      opts,
    );

    return [result];
  }
}
