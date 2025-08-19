import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { BenchRunner, RunnerOptions } from "./BenchRunner.ts";
import { executeBenchmark } from "./BenchRunner.ts";

type TimeStatistics = {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p75: number;
  p99: number;
  p999: number;
};

/** Simple runner with time and iteration limits */
export class BasicRunner implements BenchRunner {
  async runBench<T = unknown>(
    benchmark: BenchmarkSpec<T>,
    options: RunnerOptions,
    params?: T,
  ): Promise<MeasuredResults[]> {
    const samples = collectSamples(benchmark, options, params);
    const time = calculateTimeStatistics(samples);
    return [{ name: benchmark.name, samples, time }];
  }
}

function collectSamples<T>(
  benchmark: BenchmarkSpec<T>,
  opts: RunnerOptions,
  params?: T,
): number[] {
  const samples: number[] = [];
  const startTime = performance.now();
  const { minTime, maxTime, maxIterations } = opts;
  let iterations = 0;
  let elapsed = 0;

  if (!maxIterations && !maxTime && !minTime) {
    throw new Error(
      `At least one of maxIterations, maxTime, or minTime must be set`,
    );
  }
  const gc = gcFunction();
  gc();

  while (true) {
    if (maxIterations && iterations > maxIterations) break;
    if (maxTime && elapsed >= maxTime) break;
    if (minTime && !maxTime && !maxIterations && elapsed > minTime) break;

    const sampleStart = performance.now();
    executeBenchmark(benchmark, params);
    const sampleEnd = performance.now();

    samples.push(sampleEnd - sampleStart);
    iterations++;

    elapsed = sampleEnd - startTime;
  }

  if (samples.length === 0) {
    throw new Error(`No samples collected for benchmark: ${benchmark.name}`);
  }
  return samples;
}

function calculateTimeStatistics(samples: number[]): TimeStatistics {
  const sortedSamples = [...samples].sort((a, b) => a - b);
  const avg = samples.reduce((sum, s) => sum + s, 0) / samples.length;

  return {
    min: sortedSamples[0],
    max: sortedSamples[sortedSamples.length - 1],
    avg,
    p50: percentile(sortedSamples, 0.5),
    p75: percentile(sortedSamples, 0.75),
    p99: percentile(sortedSamples, 0.99),
    p999: percentile(sortedSamples, 0.999),
  };
}

function percentile(sortedArray: number[], p: number): number {
  const index = (sortedArray.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;

  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/** fetch the runtime's function to call gc() manually */
function gcFunction(): () => void {
  const gc = globalThis.gc || (globalThis as any).__gc;
  if (gc) return gc;
  console.warn(
    "MitataBench: gc() not available, run node/bun with --expose-gc",
  );
  return () => {};
}
