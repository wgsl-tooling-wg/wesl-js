import { handleWorkerError } from "../BenchmarkErrors.ts";
import type { BenchmarkReport } from "../BenchmarkReport.ts";
import type { MeasureOptions } from "../mitata-util/MitataBench.ts";
import type { MeasuredResults } from "../mitata-util/MitataStats.ts";
import type { RunnerOptions } from "../runners/RunnerUtils.ts";
import type { WorkerMessage } from "../WorkerBench.ts";
import {
  type BenchmarkRunConfig,
  createBenchmarkMessage,
  runBenchmarkInWorkerThread,
} from "../WorkerHelpers.ts";
import type { ParserVariant } from "./BenchVariations.ts";
import { calculateLinesOfCode, calculateLinesOfCodeFromFiles } from "./LinesOfCode.ts";
import type { BenchTest as WeslBenchTest } from "./WeslBenchmarks.ts";

/** Run benchmarks in worker threads for better isolation */
export async function workerBenchAndReport(
  tests: WeslBenchTest[],
  opts: MeasureOptions,
  variants: ParserVariant[],
  useBaseline: boolean,
  runner: WorkerMessage["runner"] = "standard",
  runnerOpts?: RunnerOptions,
): Promise<BenchmarkReport[]> {
  const allReports: BenchmarkReport[] = [];

  for (const variant of variants) {
    for (const test of tests) {
      const report = await runBenchmarkInWorker(
        test,
        variant,
        opts,
        useBaseline,
        runner,
        runnerOpts,
      );
      if (report) {
        allReports.push(report);
      }
    }
  }

  return allReports;
}

/** Run simple benchmarks in worker threads */
export async function workerBenchSimple(
  name: string,
  fn: (weslSrc: Record<string, string>) => void,
  weslSrc: Record<string, string>,
  opts: MeasureOptions,
  runner: WorkerMessage["runner"] = "standard",
  runnerOpts?: RunnerOptions,
): Promise<BenchmarkReport> {
  const report = await runSimpleBenchmarkInWorker(
    name,
    fn.toString(),
    weslSrc,
    opts,
    true, // always run baseline for simple tests
    runner,
    runnerOpts,
  );

  if (!report) {
    throw new Error(`Failed to run simple benchmark: ${name}`);
  }

  // Convert to BenchmarkReport format
  return {
    name,
    mainResult: report.mainResult,
    baseline: report.baseline,
    metadata: {
      mainFile: "N/A",
      files: weslSrc,
      linesOfCode: calculateLinesOfCodeFromFiles(weslSrc),
    },
  };
}

// Private helper functions

/** Run a single benchmark in worker threads */
async function runBenchmarkInWorker(
  test: WeslBenchTest,
  variant: ParserVariant,
  opts: MeasureOptions,
  useBaseline: boolean,
  runner: WorkerMessage["runner"] = "standard",
  runnerOpts?: RunnerOptions,
): Promise<BenchmarkReport | null> {
  const testName = getTestName(variant, test.name);
  const workerScript = new URL("./WeslWorkerScript.ts", import.meta.url)
    .pathname;

  try {
    const mainResult = await runStandardBenchmark(
      test,
      variant,
      opts,
      testName,
      runner,
      runnerOpts,
      false,
      workerScript,
    );
    if (!mainResult) return null;

    const baseline = useBaseline
      ? ((await runStandardBenchmark(
          test,
          variant,
          opts,
          testName,
          runner,
          runnerOpts,
          true,
          workerScript,
        )) ?? undefined)
      : undefined;

    return {
      name: testName,
      mainResult,
      baseline,
      metadata: {
        benchTest: test,
        linesOfCode: calculateLinesOfCode(test),
      },
    };
  } catch (error) {
    return handleWorkerError(test.name, error);
  }
}

/** Run standard benchmark (current or baseline) */
async function runStandardBenchmark(
  test: WeslBenchTest,
  variant: ParserVariant,
  opts: MeasureOptions,
  testName: string,
  runner: WorkerMessage["runner"],
  runnerOpts: RunnerOptions | undefined,
  isBaseline: boolean,
  workerScript: string,
): Promise<MeasuredResults | null> {
  const config: BenchmarkRunConfig = {
    name: testName,
    opts,
    runner,
    runnerOpts,
    isBaseline,
  };
  const msg = createBenchmarkMessage(config, {
    type: "standard",
    test,
    variant,
  });

  return (
    (await runBenchmarkInWorkerThread(
      workerScript,
      msg,
      isBaseline ? undefined : error => console.error(`${test.name}: ${error}`),
    )) ?? null
  );
}

async function runSimpleBenchmarkInWorker(
  name: string,
  fnString: string,
  weslSrc: Record<string, string>,
  opts: MeasureOptions,
  useBaseline: boolean,
  runner: WorkerMessage["runner"] = "standard",
  runnerOpts?: RunnerOptions,
): Promise<Omit<BenchmarkReport, "name" | "metadata"> | null> {
  const workerScript = new URL("./WeslWorkerScript.ts", import.meta.url)
    .pathname;

  try {
    const mainResult = await runSimpleBenchmark(
      name,
      fnString,
      weslSrc,
      opts,
      runner,
      runnerOpts,
      false,
      workerScript,
    );
    if (!mainResult) return null;

    const baseline = useBaseline
      ? ((await runSimpleBenchmark(
          name,
          fnString,
          weslSrc,
          opts,
          runner,
          runnerOpts,
          true,
          workerScript,
        )) ?? undefined)
      : undefined;

    return { mainResult, baseline };
  } catch (error) {
    return handleWorkerError("Simple benchmark", error);
  }
}

/** Run a simple benchmark in worker threads (current or baseline) */
async function runSimpleBenchmark(
  name: string,
  fnString: string,
  weslSrc: Record<string, string>,
  opts: MeasureOptions,
  runner: WorkerMessage["runner"],
  runnerOpts: RunnerOptions | undefined,
  isBaseline: boolean,
  workerScript: string,
): Promise<MeasuredResults | null> {
  const config: BenchmarkRunConfig = {
    name,
    opts,
    runner,
    runnerOpts,
    isBaseline,
  };
  const msg = createBenchmarkMessage(config, {
    type: "simple",
    simpleFn: fnString,
    weslSrc,
  });

  return (
    (await runBenchmarkInWorkerThread(
      workerScript,
      msg,
      isBaseline ? undefined : error => console.error(error),
    )) ?? null
  );
}


function getTestName(variant: string, testName: string): string {
  return variant === "link" ? testName : `(${variant}) ${testName}`;
}
