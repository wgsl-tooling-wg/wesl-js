import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasureOptions } from "../mitata-util/MitataBench.ts";
import type { MeasuredResults } from "../mitata-util/MitataStats.ts";

// Types
interface TimeStats {
  min: number;
  max: number;
  avg: number;
  p25: number;
  p50: number;
  p75: number;
  p99: number;
  p999: number;
}

export interface RunnerOptions {
  time?: number;
  warmupTime?: number;
  warmupRuns?: number;
  iterations?: number;
  cpuCounters?: boolean;
  observeGc?: boolean;
  suppressProgress?: boolean;
}

// Core benchmark runner types
type RunSingleBenchmarkFn<T> = (
  spec: BenchmarkSpec<T>,
  options: RunnerOptions,
) => Promise<MeasuredResults>;

export interface Runner<T> {
  name: string;
  runSingleBenchmark: RunSingleBenchmarkFn<T>;
}

// Exported functions

export function normalizeResults(
  name: string,
  samples: number[],
  additionalData?: Partial<MeasuredResults>,
): MeasuredResults {
  const sortedSamples = [...samples].sort((a, b) => a - b);
  const timeStats = calculateTimeStats(sortedSamples);

  return {
    name,
    samples: sortedSamples,
    time: timeStats,
    ...additionalData,
  };
}

function calculateTimeStats(samples: number[]): TimeStats {
  const min = samples[0];
  const max = samples[samples.length - 1];
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;

  return {
    min,
    max,
    avg,
    p25: getPercentile(samples, 0.25),
    p50: getPercentile(samples, 0.5),
    p75: getPercentile(samples, 0.75),
    p99: getPercentile(samples, 0.99),
    p999: getPercentile(samples, 0.999),
  };
}

// Progress logging utility
export function logBenchmarkProgress(
  name: string,
  runner: string,
  options: RunnerOptions,
): void {
  if (!options.suppressProgress) {
    const isBaseline = name.includes("(baseline)");
    const benchType = isBaseline ? "baseline" : "main";
    process.stderr.write(
      `Running ${benchType} benchmark: ${name} with ${runner} runner\n`,
    );
  }
}

// Default values for runner options
export const defaultRunnerOptions = {
  time: 1,
  warmupTime: 100,
  warmupRuns: 10,
  iterations: 12,
  cpuCounters: false,
  observeGc: false,
} as const;

// Time conversion utilities
export const timeConversions = {
  secToNs: 1e9,
  secToMs: 1e3,
  nsToMs: 1e-6,
} as const;

// GC utility
export function getGc(): () => void {
  return globalThis.gc || (() => {});
}

// Create MeasureOptions for mitata
export function createMeasureOptions(options: RunnerOptions): MeasureOptions {
  return {
    min_cpu_time:
      (options.time ?? defaultRunnerOptions.time) * timeConversions.secToNs,
    cpuCounters: options.cpuCounters ?? defaultRunnerOptions.cpuCounters,
    observeGC: options.observeGc ?? defaultRunnerOptions.observeGc,
    inner_gc: false,
    args: {}, // Required by MeasureOptions
  } as MeasureOptions;
}

// Low-level utility functions
function getPercentile(samples: number[], p: number): number {
  const index = Math.floor(samples.length * p);
  return samples[Math.min(index, samples.length - 1)];
}
