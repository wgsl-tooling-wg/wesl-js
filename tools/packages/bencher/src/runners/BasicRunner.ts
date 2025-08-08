import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { BenchRunner, RunnerOptions } from "./BenchRunner.ts";
import { executeBenchmark } from "./BenchRunner.ts";

type SampleCollectionParams<T = unknown> = {
  benchmark: BenchmarkSpec<T>;
  maxTime: number;
  maxIterations: number;
  params?: T;
};

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
    const { maxTime = 5000, maxIterations = 1000000 } = options;
    const samples = collectSamples({
      benchmark,
      maxTime,
      maxIterations,
      params,
    });
    const time = calculateTimeStatistics(samples);
    return [{ name: benchmark.name, samples, time }];
  }
}

function collectSamples<T>({
  benchmark,
  maxTime,
  maxIterations,
  params,
}: SampleCollectionParams<T>): number[] {
  const samples: number[] = [];
  const startTime = performance.now();
  let iterations = 0;

  while (iterations < maxIterations) {
    const sampleStart = performance.now();
    executeBenchmark(benchmark, params);
    const sampleEnd = performance.now();

    samples.push(sampleEnd - sampleStart);
    iterations++;

    if (sampleEnd - startTime >= maxTime) break;
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
