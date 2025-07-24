import type { BenchConfig } from "../BenchConfig.ts";
import type { BenchTest } from "../Benchmark.ts";
import type { BenchmarkReport } from "../BenchmarkReport.ts";
import type { MeasureOptions } from "../mitata-util/MitataBench.ts";
import type { MeasuredResults } from "../mitata-util/MitataStats.ts";
import { runBenchmarks } from "../RunBenchmark.ts";
import type { WorkerMessage } from "../WorkerBench.ts";
import { runBenchmarkInWorkerThread } from "../WorkerHelpers.ts";
import type { BenchTest as WeslBenchTest } from "./WeslBenchmarks.ts";

/** Simplified benchmark runner that supports only standard mode */
export async function shortcutBench(
  tests: BenchTest<any>[],
  config: BenchConfig,
): Promise<BenchmarkReport[]> {
  // Force standard runner
  config.runner = "standard";

  if (config.mode === "worker") {
    return runShortcutWorkerBenchmarks(tests, config);
  } else {
    return runShortcutStandardBenchmarks(tests, config);
  }
}

/** Run benchmarks in the current process (non-worker mode) */
async function runShortcutStandardBenchmarks(
  tests: BenchTest<any>[],
  config: BenchConfig,
): Promise<BenchmarkReport[]> {
  // Use the existing runBenchmarks function with minimal options
  const options = {
    runner: "standard" as const,
    filter: config.filter,
    useBaseline: config.useBaseline,
    time: config.time,
    warmupTime: config.warmupTime,
    warmupRuns: config.warmupRuns,
    iterations: config.iterations,
    showCpu: config.showCpu,
    observeGc: config.observeGc,
    // Add converter to transform results to expected format
    reportConverter: convertShortcutReports,
  };

  // runBenchmarks will handle standard mode internally
  return runBenchmarks(tests, options);
}

/** Convert benchmark results to the expected report format */
function convertShortcutReports(reports: any[]): BenchmarkReport[] {
  return reports.flatMap(report =>
    report.results.map((result: any) => {
      // Extract lines of code from metadata if available
      const linesOfCode =
        report.test.metadata?.linesOfCode ||
        (report.test.metadata?.weslBenchTest
          ? calculateLinesOfCodeFromTest(report.test.metadata.weslBenchTest)
          : 0);

      return {
        name: `${report.test.name}/${result.spec.name}`,
        mainResult: result.mainResult,
        baseline: result.baselineResult,
        metadata: {
          ...report.test.metadata,
          linesOfCode,
        },
      };
    }),
  );
}

function calculateLinesOfCodeFromTest(benchTest: WeslBenchTest): number {
  return [...benchTest.files.values()]
    .map(code => code.split("\n").length)
    .reduce((a, b) => a + b, 0);
}

/** Run benchmarks in worker threads */
async function runShortcutWorkerBenchmarks(
  tests: BenchTest<any>[],
  config: BenchConfig,
): Promise<BenchmarkReport[]> {
  const reports: BenchmarkReport[] = [];
  const workerScript = new URL("./WeslWorkerScript.ts", import.meta.url).pathname;

  for (const test of tests) {
    // Get the original WeslBenchTest if available
    const weslTest = test.metadata?.weslBenchTest as WeslBenchTest | undefined;
    if (!weslTest) {
      console.warn(`Skipping test ${test.name} - no WESL metadata for worker mode`);
      continue;
    }

    // Extract variants from benchmark names
    const variants = new Set<string>();
    for (const benchmark of test.benchmarks) {
      const match = benchmark.name.match(/^(\w+):/);
      if (match) {
        variants.add(match[1]);
      }
    }

    // Run each variant
    for (const variant of variants) {
      const testName = variant === "link" ? test.name : `(${variant}) ${test.name}`;
      
      // Run main benchmark
      const mainResult = await runWorkerBenchmark(
        weslTest,
        variant,
        testName,
        config,
        false,
        workerScript,
      );

      // Run baseline if requested
      const baseline = config.useBaseline
        ? await runWorkerBenchmark(weslTest, variant, testName, config, true, workerScript) ?? undefined
        : undefined;

      if (mainResult) {
        reports.push({
          name: testName,
          mainResult,
          baseline,
          metadata: {
            benchTest: weslTest,
            linesOfCode: calculateLinesOfCode(weslTest),
          },
        });
      }
    }
  }

  return reports;
}

/** Run a single benchmark in a worker thread */
async function runWorkerBenchmark(
  test: WeslBenchTest,
  variant: string,
  testName: string,
  config: BenchConfig,
  isBaseline: boolean,
  workerScript: string,
): Promise<MeasuredResults | null> {
  const message: WorkerMessage = {
    type: "standard",
    runner: "standard",
    test,
    variant: variant as any,
    opts: {
      min_cpu_time: config.time * 1e9, // Convert seconds to nanoseconds
      cpuCounters: config.showCpu,
      observeGC: config.observeGc,
      inner_gc: config.collectGc,
    } as MeasureOptions,
    isBaseline,
    testName: isBaseline ? "--> baseline" : testName,
  };

  try {
    return await runBenchmarkInWorkerThread(
      workerScript,
      message,
      isBaseline ? undefined : error => console.error(`${test.name}: ${error}`),
    ) ?? null;
  } catch (error) {
    console.error(`Error running ${test.name} in worker:`, error);
    return null;
  }
}

function calculateLinesOfCode(test: WeslBenchTest): number {
  return [...test.files.values()]
    .map(code => code.split("\n").length)
    .reduce((a, b) => a + b, 0);
}