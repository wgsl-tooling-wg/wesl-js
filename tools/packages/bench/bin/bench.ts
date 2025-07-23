import { hideBin } from "yargs/helpers";
import type { BenchTest } from "../src/Benchmark.ts";
import { type BenchmarkReport, reportResults } from "../src/BenchmarkReport.ts";
import {
  type MeasureOptions,
  mitataBench,
} from "../src/mitata-util/MitataBench.ts";
import type { MeasuredResults } from "../src/mitata-util/MitataStats.ts";
import {
  type RunBenchmarkOptions,
  runBenchmarks,
} from "../src/RunBenchmark.ts";
import { vanillaMitataBatch } from "../src/runners/VanillaMitataBatch.ts";
import type { ParserVariant } from "../src/wesl/BenchVariations.ts";
import { loadSimpleFiles, loadSimpleTest } from "../src/wesl/LoadSimpleTest.ts";
import {
  setupWeslBenchmarks,
  validateVariants,
  type BenchTest as WeslBenchTest,
} from "../src/wesl/WeslBenchmarks.ts";
import { convertToWeslReports } from "../src/wesl/WeslReportConverter.ts";
import {
  workerBenchAndReport,
  workerBenchSimple,
} from "../src/wesl/WeslWorkerBench.ts";
import { cliArgs } from "../src/wesl/CliArgs.ts";

/** Options specific to each runner implementation */
interface RunnerSpecificOptions {
  /** For tinybench and manual runners */
  warmupTime?: number;
  /** For tinybench and manual runners */
  warmupRuns?: number;
  /** For manual runner */
  iterations?: number;
}

/** Result of running a benchmark pair */
interface BenchmarkPairResult {
  current: MeasuredResults;
  baseline?: MeasuredResults;
}

/** Default benchmark runner options */
const defaultRunnerOptions = {
  tinybench: {
    warmupTime: 100,
    warmupRuns: 10,
  },
  manual: {
    warmupRuns: 10,
    iterations: 12,
  },
  standard: {},
  "vanilla-mitata": {},
} as const;

export const baselineDir = "../../../../../_baseline";

// Entry point
const rawArgs = hideBin(process.argv);
main(rawArgs);

type CliArgs = ReturnType<typeof cliArgs>;

async function main(args: string[]): Promise<void> {
  const argv = cliArgs(args);

  // Validate that only one benchmark mode is selected (worker can be combined)
  const benchModes = ["mitata", "tinybench", "manual"].filter(
    mode => argv[mode],
  );
  if (benchModes.length > 1) {
    console.error(`Cannot use --${benchModes.join(" and --")} together`);
    process.exit(1);
  }

  if (argv.profile) {
    argv.baseline = false; // no baseline comparison in profile mode
  }

  if (argv.simple) {
    await runSimpleBenchmarks(argv);
  } else {
    await runBenchmarksMain(argv);
  }
}


/** create benchmark options from CLI arguments */
function createBenchmarkOptions(argv: CliArgs): MeasureOptions {
  const { time, cpu, observeGc, collect } = argv;
  return {
    min_cpu_time: time * 1e9, // convert seconds to nanoseconds
    cpuCounters: cpu,
    observeGC: observeGc,
    inner_gc: collect,
  } as MeasureOptions;
}

/** run the selected benchmark variants */
async function runBenchmarksMain(argv: CliArgs): Promise<void> {
  // Setup WESL benchmarks
  const variants = validateVariants(argv.variant as string[]);
  const tests = await setupWeslBenchmarks(argv.filter, variants, argv.baseline);

  if (argv.profile) {
    // Profile mode - run first benchmark once without data collection
    await runProfileMode(tests);
  } else if (argv.worker) {
    // Worker mode
    await runWorkerBenchmarks(argv, tests);
  } else {
    // Use standard runner for benchmarks
    await runStandardBenchmarks(argv, tests);
  }
}

/** Run benchmarks in worker mode */
async function runWorkerBenchmarks(
  argv: CliArgs,
  tests: BenchTest<any>[],
): Promise<void> {
  const { runner, runnerOpts } = selectRunner(argv);

  // Worker mode expects BenchTest objects
  const reports: BenchmarkReport[] = [];

  for (const test of tests) {
    // Get the original BenchTest if available (for WESL benchmarks)
    const benchTest = test.metadata?.weslBenchTest;
    if (!benchTest) {
      console.warn(
        `Skipping test ${test.name} - no BenchTest metadata for worker mode`,
      );
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

    if (runner === "vanilla-mitata") {
      // Use vanilla mitata batch mode
      const batchReports = await vanillaMitataBatch([test], {
        runner: "vanilla-mitata",
        time: argv.time,
        useBaseline: argv.baseline,
      });

      // Convert reports to WESL format
      const converted = convertToWeslReports(batchReports);
      reports.push(...converted);
    } else {
      // Use standard worker mode
      const opts = createBenchmarkOptions(argv);
      const workerReports = await workerBenchAndReport(
        [benchTest],
        opts,
        Array.from(variants) as ParserVariant[],
        argv.baseline,
        runner,
        runnerOpts,
      );
      reports.push(...workerReports);
    }
  }

  reportResults(reports, { cpu: argv.cpu });
}

/** Run benchmarks using the standard infrastructure */
async function runStandardBenchmarks(
  argv: CliArgs,
  tests: BenchTest<any>[],
): Promise<void> {
  const { runner, runnerOpts } = selectRunner(argv);

  // Create options for the runner
  const options: RunBenchmarkOptions = {
    runner,
    filter: argv.filter,
    showCpu: argv.cpu,
    useBaseline: argv.baseline,
    time: argv.time,
    warmupTime: runnerOpts.warmupTime,
    warmupRuns: runnerOpts.warmupRuns,
    iterations: runnerOpts.iterations,
    cpuCounters: argv.cpu,
    observeGc: argv.observeGc,
  };

  // Run benchmarks
  const results = await runBenchmarks(tests, options);

  // Report results
  reportResults(convertToWeslReports(results), { cpu: argv.cpu });
}

/** Select runner based on CLI arguments */
function selectRunner(argv: CliArgs): {
  runner: "standard" | "tinybench" | "manual" | "vanilla-mitata";
  runnerOpts: RunnerSpecificOptions;
} {
  if (argv.mitata) {
    return {
      runner: "vanilla-mitata",
      runnerOpts: defaultRunnerOptions["vanilla-mitata"],
    };
  } else if (argv.tinybench) {
    return {
      runner: "tinybench",
      runnerOpts: defaultRunnerOptions.tinybench,
    };
  } else if (argv.manual) {
    return { runner: "manual", runnerOpts: defaultRunnerOptions.manual };
  }
  return { runner: "standard", runnerOpts: defaultRunnerOptions.standard };
}

/** Handle results from worker mode */
function handleWorkerResults(
  _runner: string,
  reports: BenchmarkReport[],
  showCpu: boolean,
): void {
  reportResults(reports, { cpu: showCpu });
}

/** run a simple benchmark against itself */
async function runSimpleBenchmarks(argv: CliArgs): Promise<void> {
  const { fn, name } = loadSimpleTest(argv.simple);
  const weslSrc = await loadSimpleFiles();
  console.log(`Benching simple test: ${name}`);

  if (argv.worker) {
    await runSimpleWorkerBenchmark(argv, name, fn, weslSrc);
  } else if (argv.tinybench) {
    throw new Error("--tinybench option no longer supported");
  } else {
    await runSimpleStandardBenchmark(argv, name, fn, weslSrc);
  }
}

/** Run simple benchmark in worker mode */
async function runSimpleWorkerBenchmark(
  argv: CliArgs,
  name: string,
  fn: (weslSrc: Record<string, string>) => void,
  weslSrc: Record<string, string>,
): Promise<void> {
  const opts = createBenchmarkOptions(argv);
  const { runner, runnerOpts } = selectRunner(argv);

  const report = await workerBenchSimple(
    name,
    fn,
    weslSrc,
    opts,
    runner,
    runnerOpts,
  );

  handleWorkerResults(runner, [report], argv.cpu);
}

/** Run simple benchmark in standard mode */
async function runSimpleStandardBenchmark(
  argv: CliArgs,
  name: string,
  fn: (weslSrc: Record<string, string>) => void,
  weslSrc: Record<string, string>,
): Promise<void> {
  const opts = createBenchmarkOptions(argv);
  const { current, baseline } = await runBenchmarkPair(
    () => fn(weslSrc),
    name,
    opts,
    () => fn(weslSrc),
  );

  const report = createSimpleBenchmarkReport(name, weslSrc, current, baseline);
  reportResults([report], { cpu: argv.cpu });
}

/** Create benchmark report for simple tests */
function createSimpleBenchmarkReport(
  name: string,
  weslSrc: Record<string, string>,
  current: MeasuredResults,
  baseline?: MeasuredResults,
): BenchmarkReport {
  const files = new Map(Object.entries(weslSrc));
  const benchTest: WeslBenchTest = { name, mainFile: "N/A", files };
  return {
    name,
    mainResult: current,
    baseline,
    metadata: {
      benchTest,
      linesOfCode: calculateLinesOfCode(weslSrc),
    },
  };
}

function calculateLinesOfCode(weslSrc: Record<string, string>): number {
  return Object.values(weslSrc)
    .map(code => code.split("\n").length)
    .reduce((a, b) => a + b, 0);
}

/** run a benchmark with current and optional baseline implementations */
async function runBenchmarkPair(
  currentFn: () => void,
  testName: string,
  opts: MeasureOptions,
  baselineFn?: () => void,
): Promise<BenchmarkPairResult> {
  // Use stderr to avoid mitata output capture
  process.stderr.write(
    `Running main benchmark: ${testName} with standard runner\n`,
  );
  const current = await mitataBench(currentFn, testName, opts);

  let baseline: MeasuredResults | undefined;
  if (baselineFn) {
    process.stderr.write(
      `Running baseline benchmark: ${testName} with standard runner\n`,
    );
    baseline = await mitataBench(baselineFn, "--> baseline", opts);
  }

  return { current, baseline };
}

/** Run profile mode - execute first benchmark once without data collection
 * Useful for attaching the profiler or for continuous integration */
async function runProfileMode(tests: BenchTest<any>[]): Promise<void> {
  if (tests.length === 0) {
    console.error("No benchmarks to profile");
    return;
  }

  const firstTest = tests[0];
  if (firstTest.benchmarks.length === 0) {
    console.error("No benchmark specs in first test");
    return;
  }

  // Setup test data if needed
  const params = firstTest.setup ? await firstTest.setup() : {};

  // Run the first benchmark function once
  const firstBenchmark = firstTest.benchmarks[0];
  const benchParams = firstBenchmark.params ?? params;

  console.log(`Profiling: ${firstBenchmark.name}`);
  firstBenchmark.fn(benchParams);
}

/** Get test name with variant prefix if needed */
export function getTestName(variant: ParserVariant, testName: string): string {
  return variant === "link" ? testName : `(${variant}) ${testName}`;
}
