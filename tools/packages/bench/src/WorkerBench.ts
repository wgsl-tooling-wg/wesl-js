import type { BenchTest } from "./Benchmark.ts";
import type { MeasureOptions } from "./mitata-util/MitataBench.ts";
import type { MeasuredResults } from "./mitata-util/MitataStats.ts";
import type { BenchmarkReport, RunBenchmarkOptions } from "./RunBenchmark.ts";
import type { RunnerOptions } from "./runners/RunnerUtils.ts";

/** Worker message for any benchmark type */
export interface WorkerMessage<T = unknown> {
  type: "benchmark" | "standard" | "simple";
  testName: string;
  benchmarkSpec?: {
    name: string;
    fn: string; // serialized function
    params: T;
    isBaseline?: boolean;
  };
  metadata?: Record<string, any>;
  opts: MeasureOptions;
  runner?: "standard" | "tinybench" | "manual" | "vanilla-mitata";
  runnerOpts?: RunnerOptions;
  // Additional fields for extensibility
  [key: string]: any;
}

export interface WorkerResult {
  type: "result";
  measured: MeasuredResults;
  error?: string;
}

// Exported functions

/** Run benchmarks in worker threads */
export async function runBenchmarksInWorker<T>(
  tests: BenchTest<T>[],
  options: RunBenchmarkOptions,
): Promise<BenchmarkReport<T>[]> {
  const { runBenchmarksInWorker: runInWorker } = await import(
    "./runners/WorkerRunner.ts"
  );
  const workerResults = await runInWorker(tests, options);

  return convertWorkerResultsToReports(workerResults);
}

/** Convert worker results to benchmark reports */
function convertWorkerResultsToReports<T>(
  workerResults: Array<{
    test: BenchTest<T>;
    benchmarkName: string;
    result: MeasuredResults;
    isBaseline?: boolean;
  }>,
): BenchmarkReport<T>[] {
  const resultMap = groupResultsByTest(workerResults);
  return createReportsFromGroupedResults(resultMap);
}

/** Group worker results by test and benchmark name */
function groupResultsByTest<T>(
  workerResults: Array<{
    test: BenchTest<T>;
    benchmarkName: string;
    result: MeasuredResults;
    isBaseline?: boolean;
  }>,
): Map<BenchTest<T>, Map<string, any>> {
  const resultMap = new Map<BenchTest<T>, Map<string, any>>();

  for (const result of workerResults) {
    const benchMap = resultMap.get(result.test) ?? new Map();
    if (!resultMap.has(result.test)) resultMap.set(result.test, benchMap);

    const benchResult = benchMap.get(result.benchmarkName) ?? {
      spec: result.test.benchmarks.find(b => b.name === result.benchmarkName),
      mainResult: undefined,
      baselineResult: undefined,
    };
    if (!benchMap.has(result.benchmarkName))
      benchMap.set(result.benchmarkName, benchResult);

    if (result.isBaseline) {
      benchResult.baselineResult = result.result;
    } else {
      benchResult.mainResult = result.result;
    }
  }

  return resultMap;
}

/** Create final reports from grouped results */
function createReportsFromGroupedResults<T>(
  resultMap: Map<BenchTest<T>, Map<string, any>>,
): BenchmarkReport<T>[] {
  return Array.from(resultMap.entries())
    .map(([test, benchMap]) => ({
      test,
      results: Array.from(benchMap.values()).filter(
        r => r.spec && r.mainResult,
      ),
    }))
    .filter(report => report.results.length > 0);
}

// Lower-level utility functions

/** Create worker message for any benchmark type */
export function createWorkerMessage<T>(
  testName: string,
  benchmarkSpec: {
    name: string;
    fn: string;
    params: T;
    isBaseline?: boolean;
  },
  opts: MeasureOptions,
  metadata?: WorkerMessage["metadata"],
  runner: WorkerMessage["runner"] = "standard",
  runnerOpts?: RunnerOptions,
): WorkerMessage<T> {
  return {
    type: "benchmark",
    testName,
    benchmarkSpec,
    metadata,
    opts,
    runner,
    runnerOpts,
  };
}
