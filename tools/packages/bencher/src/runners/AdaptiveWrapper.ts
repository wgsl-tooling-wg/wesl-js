import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { BenchRunner, RunnerOptions } from "./BenchRunner.ts";

export interface AdaptiveOptions extends RunnerOptions {
  adaptive?: boolean;
  minTime?: number;
  maxTime?: number;
}

/** @return runner that samples for specified duration */
export function createAdaptiveWrapper(
  baseRunner: BenchRunner,
  options: AdaptiveOptions,
): BenchRunner {
  return {
    async runBench<T = unknown>(
      benchmark: BenchmarkSpec<T>,
      runnerOptions: RunnerOptions,
      params?: T,
    ): Promise<MeasuredResults[]> {
      return runBench(baseRunner, benchmark, runnerOptions, options, params);
    },
  };
}

/** Run benchmark for specified duration */
async function runBench<T>(
  baseRunner: BenchRunner,
  benchmark: BenchmarkSpec<T>,
  runnerOptions: RunnerOptions,
  options: AdaptiveOptions,
  params?: T,
): Promise<MeasuredResults[]> {
  const { minTime = 642, maxTime = 30000 } = options;
  // Use the smaller of minTime and maxTime as the target
  const targetTime = Math.min(minTime, maxTime);
  const allSamples: number[] = []; // Collect all raw samples in nanoseconds
  const startTime = performance.now();

  const results = await baseRunner.runBench(
    benchmark,
    {
      ...runnerOptions,
      minTime: Math.min(targetTime, 100),
      maxIterations: undefined,
    },
    params,
  );

  collectSamples(results[0], allSamples);

  // Continue running until we reach the target time
  while (performance.now() - startTime < targetTime) {
    const batchResults = await baseRunner.runBench(
      benchmark,
      { ...runnerOptions, minTime: 100, maxIterations: 10 },
      params,
    );

    collectSamples(batchResults[0], allSamples);
    // Don't need to merge results anymore since we're rebuilding from samples
  }

  return buildFinalResults(results[0], allSamples, startTime);
}

/** Add samples to running totals */
function collectSamples(result: MeasuredResults, samples: number[]): void {
  if (result.samples) {
    // Use a loop instead of spread to avoid stack overflow with large arrays
    for (const sample of result.samples) {
      samples.push(sample);
    }
  }
}

/** @return results with total sampling time */
function buildFinalResults(
  result: MeasuredResults,
  samples: number[],
  startTime: number,
): MeasuredResults[] {
  const totalTime = (performance.now() - startTime) / 1000;

  // Convert samples from nanoseconds to milliseconds for consistency
  const samplesInMs = samples.map(s => s / 1_000_000);

  // Recalculate time statistics from all collected samples
  const timeStats =
    samples.length > 0 ? calculateTimeStatistics(samples) : result.time;

  return [
    {
      ...result,
      samples: samplesInMs,
      time: timeStats,
      totalTime,
    },
  ];
}

/** @return min, max, avg, and percentile statistics (converted from ns to ms) */
function calculateTimeStatistics(samples: number[]) {
  // Samples are in nanoseconds, convert to milliseconds
  const msConversion = 1_000_000;
  // Use reduce to avoid stack overflow with large arrays
  const min = samples.reduce(
    (a, b) => Math.min(a, b),
    Number.POSITIVE_INFINITY,
  );
  const max = samples.reduce(
    (a, b) => Math.max(a, b),
    Number.NEGATIVE_INFINITY,
  );
  const sum = samples.reduce((a, b) => a + b, 0);

  return {
    min: min / msConversion,
    max: max / msConversion,
    avg: sum / samples.length / msConversion,
    p50: percentile(samples, 0.5) / msConversion,
    p75: percentile(samples, 0.75) / msConversion,
    p99: percentile(samples, 0.99) / msConversion,
    p999: percentile(samples, 0.999) / msConversion,
  };
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}
