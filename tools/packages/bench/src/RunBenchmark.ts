/**
 * Benchmark runner that can execute any type of benchmark
 */

import type { BenchmarkSpec, BenchTest } from "./Benchmark.ts";
import { reportResults as reportResultsImpl } from "./BenchmarkReport.ts";
import type { MeasuredResults } from "./mitata-util/MitataStats.ts";
import { getRunner, type RunnerType } from "./runners/RunnerFactory.ts";
import type { Runner, RunnerOptions } from "./runners/RunnerUtils.ts";

/** Options for running benchmarks */
export interface RunBenchmarkOptions<T = any> extends RunnerOptions {
  /** Filter benchmarks by name */
  filter?: string;
  /** Show CPU counters in output */
  showCpu?: boolean;
  /** Use baseline comparison */
  useBaseline?: boolean;
  /** Runner to use - can be a runner instance or name */
  runner: Runner<T> | RunnerType;
}

/** Result from running a benchmark test */
export interface BenchmarkReport<T = unknown> {
  test: BenchTest<T>;
  results: Array<{
    spec: BenchmarkSpec<T>;
    mainResult: MeasuredResults;
    baselineResult?: MeasuredResults;
  }>;
}

/**
 * Run a collection of benchmark tests
 */
export async function runBenchmarks<T>(
  tests: BenchTest<T>[],
  options: RunBenchmarkOptions,
): Promise<BenchmarkReport<T>[]> {
  const reports: BenchmarkReport<T>[] = [];

  for (const test of tests) {
    const report = await runSingleTest(test, options);
    reports.push(report);
  }

  return reports;
}

/**
 * Run a single benchmark test with all its benchmarks
 */
async function runSingleTest<T>(
  test: BenchTest<T>,
  options: RunBenchmarkOptions,
): Promise<BenchmarkReport<T>> {
  const results: BenchmarkReport<T>["results"] = [];

  // Setup test data once if setup function exists
  const params = test.setup ? await test.setup() : ({} as T);

  for (const spec of test.benchmarks) {
    // Apply filter if specified
    if (options.filter && !spec.name.includes(options.filter)) {
      continue;
    }

    // Override params if spec has different ones
    const benchParams = spec.params ?? params;

    // Run main benchmark
    const mainResult = await runSingleBenchmark(
      { ...spec, params: benchParams },
      options,
    );

    // Run baseline if requested and available
    let baselineResult: MeasuredResults | undefined;
    if (options.useBaseline && spec.baseline) {
      const baselineSpec: BenchmarkSpec<T> = {
        name: `${spec.name} (baseline)`,
        fn: spec.baseline.fn,
        params: benchParams,
      };
      baselineResult = await runSingleBenchmark(baselineSpec, options);
    }

    results.push({
      spec,
      mainResult,
      baselineResult,
    });
  }

  return {
    test,
    results,
  };
}

/**
 * Run a single benchmark and return results
 */
async function runSingleBenchmark<T>(
  spec: BenchmarkSpec<T>,
  options: RunBenchmarkOptions,
): Promise<MeasuredResults> {
  const runner =
    typeof options.runner === "string"
      ? getRunner<T>(options.runner)
      : options.runner;

  return runner.runSingleBenchmark(spec, options);
}

/**
 * Report benchmark results
 */
export function reportBenchmarkResults<T>(
  reports: BenchmarkReport<T>[],
  options: { cpu?: boolean } = {},
): void {
  // Convert to report format
  const reportFormat = reports.flatMap(report =>
    report.results.map((result: any) => ({
      name: `${report.test.name}/${result.spec.name}`,
      mainResult: result.mainResult,
      baseline: result.baselineResult,
      metadata: report.test.metadata,
    })),
  );

  // Use the implementation from BenchmarkReport.ts
  reportResultsImpl(reportFormat, options);
}
