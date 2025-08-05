import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { BenchRunner, RunnerOptions } from "./BenchRunner.ts";
import { executeBenchmark } from "./BenchRunner.ts";

/** Basic benchmark runner that respects max time and max iterations for timing benchmarks. */
export class BasicRunner implements BenchRunner {
  async runBench<T = unknown>(
    benchmark: BenchmarkSpec<T>,
    options: RunnerOptions,
    params?: T,
  ): Promise<MeasuredResults[]> {
    const { maxTime = 5000, maxIterations = 1000000 } = options;
    const samples: number[] = [];

    const startTime = performance.now();
    let iterations = 0;

    while (iterations < maxIterations) {
      const sampleStart = performance.now();
      executeBenchmark(benchmark, params);
      const sampleEnd = performance.now();

      const sampleTime = sampleEnd - sampleStart;
      samples.push(sampleTime);
      iterations++;

      const elapsed = sampleEnd - startTime;
      if (elapsed >= maxTime) {
        break;
      }
    }

    if (samples.length === 0) {
      throw new Error(`No samples collected for benchmark: ${benchmark.name}`);
    }

    const sortedSamples = [...samples].sort((a, b) => a - b);
    const min = sortedSamples[0];
    const max = sortedSamples[sortedSamples.length - 1];
    const avg = samples.reduce((sum, s) => sum + s, 0) / samples.length;

    const p50 = percentile(sortedSamples, 0.5);
    const p75 = percentile(sortedSamples, 0.75);
    const p99 = percentile(sortedSamples, 0.99);
    const p999 = percentile(sortedSamples, 0.999);

    const result: MeasuredResults = {
      name: benchmark.name,
      samples,
      time: {
        min,
        max,
        avg,
        p50,
        p75,
        p99,
        p999,
      },
    };

    return [result];
  }
}

function percentile(sortedArray: number[], p: number): number {
  const index = (sortedArray.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}
