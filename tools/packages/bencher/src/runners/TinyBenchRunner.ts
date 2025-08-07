import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { BenchRunner, RunnerOptions } from "./BenchRunner.ts";
import { executeBenchmark } from "./BenchRunner.ts";
import { nsToMs } from "./RunnerUtils.ts";

/** Benchmark runner using the tinybench library. */
export class TinyBenchRunner implements BenchRunner {
  async runBench<T = unknown>(
    benchmark: BenchmarkSpec<T>,
    options: RunnerOptions,
    params?: T,
  ): Promise<MeasuredResults[]> {
    const { Bench } = await import("tinybench");

    const bench = new Bench({
      time: options.maxTime,
      warmupTime: options.warmupTime,
    });

    // Wrap the benchmark function to force GC after each iteration if collect is enabled
    const gc = globalThis.gc;
    const benchFn =
      options.collect && gc
        ? () => {
            executeBenchmark(benchmark, params);
            gc();
          }
        : () => executeBenchmark(benchmark, params);

    bench.add(benchmark.name, benchFn);

    await bench.run();

    const task = bench.tasks.find(t => t.name === benchmark.name);
    if (!task?.result) {
      throw new Error(`No results found for benchmark: ${benchmark.name}`);
    }

    const samples = task.result.latency.samples.map((s: number) => s * nsToMs);

    const result: MeasuredResults = {
      name: benchmark.name,
      samples,
      time: {
        min: task.result.latency.min * nsToMs,
        max: task.result.latency.max * nsToMs,
        avg: task.result.latency.mean * nsToMs,
        p50: task.result.latency.p50! * nsToMs,
        p75: task.result.latency.p75! * nsToMs,
        p99: task.result.latency.p99! * nsToMs,
        p999: task.result.latency.p999! * nsToMs,
      },
    };

    return [result];
  }
}
