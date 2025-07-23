import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BenchmarkSpec, BenchTest } from "../Benchmark.ts";
import { formatError } from "../BenchmarkErrors.ts";
import { shouldRunBaseline } from "../BenchmarkHelpers.ts";
import type { MeasureOptions } from "../mitata-util/MitataBench.ts";
import type { MeasuredResults } from "../mitata-util/MitataStats.ts";
import type { RunBenchmarkOptions } from "../RunBenchmark.ts";
import { createWorkerMessage, type WorkerMessage } from "../WorkerBench.ts";
import { runInWorker } from "../WorkerHelpers.ts";
import type { BenchTest as WeslBenchTest } from "../wesl/WeslBenchmarks.ts";
import { createMeasureOptions } from "./RunnerUtils.ts";

// Module constants
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerScript = path.join(__dirname, "..", "WorkerScript.ts");

/** Result of running a benchmark in a worker */
interface WorkerBenchmarkResult<T> {
  test: BenchTest<T>;
  benchmarkName: string;
  result: MeasuredResults;
  isBaseline?: boolean;
}

/** Run benchmarks in worker threads */
export async function runBenchmarksInWorker<T>(
  tests: BenchTest<T>[],
  options: RunBenchmarkOptions,
): Promise<WorkerBenchmarkResult<T>[]> {
  const results: WorkerBenchmarkResult<T>[] = [];
  const measureOpts = createMeasureOptions(options);

  for (const test of tests) {
    // Setup test data if needed
    const params = test.setup ? await test.setup() : ({} as T);

    for (const benchmark of test.benchmarks) {
      // Run main benchmark
      const mainResult = await runSingleBenchmarkInWorker(
        test,
        benchmark,
        params,
        measureOpts,
        options,
        false,
      );

      if (mainResult) {
        results.push(mainResult);
      }

      // Run baseline if requested and available
      if (shouldRunBaseline(options, benchmark)) {
        const baselineResult = await runSingleBenchmarkInWorker(
          test,
          benchmark,
          params,
          measureOpts,
          options,
          true,
        );

        if (baselineResult) {
          results.push(baselineResult);
        }
      }
    }
  }

  return results;
}

/** Run a single benchmark in a worker thread */
async function runSingleBenchmarkInWorker<T>(
  test: BenchTest<T>,
  benchmark: BenchmarkSpec<T>,
  setupParams: T,
  measureOpts: MeasureOptions,
  options: RunBenchmarkOptions,
  isBaseline: boolean,
): Promise<WorkerBenchmarkResult<T> | null> {
  try {
    const benchParams = benchmark.params ?? setupParams;
    const fn =
      isBaseline && benchmark.baseline ? benchmark.baseline.fn : benchmark.fn;

    // Create metadata for LOC reporting
    const metadata: WorkerMessage["metadata"] = {
      linesOfCode: test.metadata?.linesOfCode,
      weslBenchTest: test.metadata?.weslBenchTest,
    };

    // Create worker message
    const message = createWorkerMessage(
      test.name,
      {
        name: benchmark.name,
        fn: fn.toString(),
        params: benchParams,
        isBaseline,
      },
      measureOpts,
      metadata,
      options.runner as WorkerMessage["runner"],
      {
        warmupTime: options.warmupTime,
        warmupRuns: options.warmupRuns,
        iterations: options.iterations,
        suppressProgress: true,
      },
    );

    // Run in worker
    const result = await runInWorker(workerScript, message);

    if (result.error) {
      console.error(`${test.name}/${benchmark.name}: ${result.error}`);
      return null;
    }

    return {
      test,
      benchmarkName: benchmark.name,
      result: result.measured,
      isBaseline,
    };
  } catch (error) {
    console.error(
      `Failed to run benchmark ${test.name}/${benchmark.name}: ${formatError(error)}`,
    );
    return null;
  }
}

/** Helper to calculate lines of code from BenchTest */
export function calculateLinesOfCode(benchTest: WeslBenchTest): number {
  return [...benchTest.files.values()]
    .map(code => code.split("\n").length)
    .reduce((a, b) => a + b, 0);
}
