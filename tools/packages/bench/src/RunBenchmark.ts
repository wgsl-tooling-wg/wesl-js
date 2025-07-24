/**
 * Benchmark runner that can execute any type of benchmark
 */

import type { BenchConfig } from "./BenchConfig.ts";
import type { BenchmarkSpec, BenchTest } from "./Benchmark.ts";
import type { BenchmarkReport as BenchmarkReportType } from "./BenchmarkReport.ts";
import { reportResults as reportResultsImpl } from "./BenchmarkReport.ts";
import type { MeasureOptions } from "./mitata-util/MitataBench.ts";
import type { MeasuredResults } from "./mitata-util/MitataStats.ts";
import { getRunner, type RunnerType } from "./runners/RunnerFactory.ts";
import type { Runner, RunnerOptions } from "./runners/RunnerUtils.ts";

/** Function to handle worker mode benchmarks */
export type WorkerBenchmarkHandler = (
  tests: BenchTest<any>[],
  config: BenchConfig,
) => Promise<BenchmarkReportType[]>;

/** Function to convert benchmark results to reports */
export type ReportConverter = (results: any[]) => BenchmarkReportType[];

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
  /** Handler for worker mode benchmarks */
  workerHandler?: WorkerBenchmarkHandler;
  /** Converter for benchmark reports */
  reportConverter?: ReportConverter;
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
 * Run benchmarks with unified configuration - supports both standard and worker modes
 */
export async function runBenchmarks(
  tests: BenchTest<any>[],
  configOrOptions: BenchConfig | RunBenchmarkOptions,
): Promise<BenchmarkReportType[]> {
  // If it's a BenchConfig, convert to options and handle worker mode
  if ('mode' in configOrOptions && configOrOptions.mode) {
    const config = configOrOptions as BenchConfig;
    
    if (config.mode === "worker") {
      if (!config.workerHandler) {
        throw new Error("Worker handler required for worker mode");
      }
      return config.workerHandler(tests, config);
    } else {
      // Convert config to options for standard mode
      const options = createOptionsFromConfig(config);
      return runStandardBenchmarks(tests, options);
    }
  } else {
    // It's already RunBenchmarkOptions
    const options = configOrOptions as RunBenchmarkOptions;
    return runStandardBenchmarks(tests, options);
  }
}

/**
 * Run a collection of benchmark tests in standard mode
 */
async function runStandardBenchmarks<T>(
  tests: BenchTest<T>[],
  options: RunBenchmarkOptions,
): Promise<BenchmarkReportType[]> {
  const reports: BenchmarkReport<T>[] = [];

  for (const test of tests) {
    const report = await runSingleTest(test, options);
    reports.push(report);
  }

  // Apply report converter if provided
  if (options.reportConverter) {
    return options.reportConverter(reports);
  }

  // Default: treat results as BenchmarkReportType[]
  return reports as unknown as BenchmarkReportType[];
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

/** Create RunBenchmarkOptions from BenchConfig */
function createOptionsFromConfig(config: BenchConfig): RunBenchmarkOptions {
  return {
    runner: config.runner,
    filter: config.filter,
    showCpu: config.showCpu,
    useBaseline: config.useBaseline,
    time: config.time,
    warmupTime: config.warmupTime,
    warmupRuns: config.warmupRuns,
    iterations: config.iterations,
    cpuCounters: config.showCpu,
    observeGc: config.observeGc,
    workerHandler: config.workerHandler,
    reportConverter: config.reportConverter,
  };
}

/** Create MeasureOptions from config */
export function createMeasureOptions(config: BenchConfig): MeasureOptions {
  return {
    min_cpu_time: config.time * 1e9, // convert seconds to nanoseconds
    cpuCounters: config.showCpu,
    observeGC: config.observeGc,
    inner_gc: config.collectGc,
  } as MeasureOptions;
}

/** Extract runner-specific options from config */
export function extractRunnerOptions(config: BenchConfig): any {
  return {
    warmupTime: config.warmupTime,
    warmupRuns: config.warmupRuns,
    iterations: config.iterations,
  };
}
