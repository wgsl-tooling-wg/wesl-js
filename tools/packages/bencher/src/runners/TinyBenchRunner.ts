import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { BenchRunner, RunnerOptions } from "./BenchRunner.ts";
import { executeBenchmark } from "./BenchRunner.ts";
import { nsToMs } from "./RunnerUtils.ts";

type TinyBenchResult = {
  latency: {
    samples: number[];
    min: number;
    max: number;
    mean: number;
    p50?: number;
    p75?: number;
    p99?: number;
    p999?: number;
  };
};

/** Runner using tinybench library */
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
    const benchFn = createBenchmarkFunction(benchmark, options, params);

    bench.add(benchmark.name, benchFn);
    await bench.run();

    const task = bench.tasks.find(t => t.name === benchmark.name);
    if (!task?.result) {
      throw new Error(`No results found for benchmark: ${benchmark.name}`);
    }

    return [transformTinyBenchResult(benchmark.name, task.result)];
  }
}

function createBenchmarkFunction<T>(
  benchmark: BenchmarkSpec<T>,
  options: RunnerOptions,
  params?: T,
) {
  const gc = globalThis.gc;
  return options.collect && gc
    ? () => {
        executeBenchmark(benchmark, params);
        gc();
      }
    : () => executeBenchmark(benchmark, params);
}

function transformTinyBenchResult(
  name: string,
  result: TinyBenchResult,
): MeasuredResults {
  const { samples, min, max, mean, p50, p75, p99, p999 } = result.latency;
  return {
    name,
    samples: samples.map(s => s * nsToMs),
    time: {
      min: min * nsToMs,
      max: max * nsToMs,
      avg: mean * nsToMs,
      p50: p50! * nsToMs,
      p75: p75! * nsToMs,
      p99: p99! * nsToMs,
      p999: p999! * nsToMs,
    },
  };
}
