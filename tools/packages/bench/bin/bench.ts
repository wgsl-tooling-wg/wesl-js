import path from "node:path";
import { link } from "wesl";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { type BenchmarkReport, reportResults } from "../src/BenchmarkReport.ts";
import {
  createVariantFunction,
  type ParserVariant,
} from "../src/BenchVariations.ts";
import { benchManually } from "../src/experiments/BenchManually.ts";
import { simpleMitataBench } from "../src/experiments/VanillaMitata.ts";
import { loadBenchmarkFiles } from "../src/LoadBenchmarks.ts";
import { loadSimpleFiles, loadSimpleTest } from "../src/LoadSimpleTest.ts";
import {
  type MeasureOptions,
  mitataBench,
} from "../src/mitata-util/MitataBench.ts";
import type { MeasuredResults } from "../src/mitata-util/MitataStats.ts";

export interface BenchTest {
  /** name of the test */
  name: string;

  /** Path to the main file */
  mainFile: string;

  /** All relevant files (file paths and their contents) */
  files: Map<string, string>;
}

export const baselineDir = "../../../../_baseline";

/** load the link() function from the baseline repo  */
async function loadBaselineLink(): Promise<typeof link | undefined> {
  const baselinePath = path.join(baselineDir, "packages/wesl/src/index.ts");

  return import(baselinePath)
    .then(x => x.link as unknown as typeof link)
    .catch(e => {
      console.log("Failed to load baseline link", e);
      return undefined;
    });
}

type CliArgs = ReturnType<typeof parseArgs>;

const rawArgs = hideBin(process.argv);
main(rawArgs);

async function main(args: string[]): Promise<void> {
  const argv = parseArgs(args);
  if (argv.profile) {
    argv.baseline = false; // no baseline comparison in profile mode
  }
  if (argv.simple) {
    await runSimpleBenchmarks(argv);
  } else {
    await runBenchmarks(argv);
  }
}

function parseArgs(args: string[]) {
  return yargs(args)
    .option("variant", {
      choices: [
        "link",
        "parse",
        "tokenize",
        "wgsl_reflect",
        "use-gpu",
      ] as const,
      default: ["link"] as const,
      describe: "select parser variant(s) to test (can be repeated)",
      array: true,
    })
    .option("baseline", {
      type: "boolean",
      default: true,
      describe: "run baseline comparison using _baseline directory",
    })
    .option("time", {
      type: "number",
      default: 0.642,
      requiresArg: true,
      describe: "benchmark test duration in seconds",
    })
    .option("cpu", {
      type: "boolean",
      default: false,
      describe: "enable CPU counter measurements (requires root)",
    })
    .option("collect", {
      type: "boolean",
      default: false,
      describe: "force a garbage collection after each test",
    })
    .option("observe-gc", {
      type: "boolean",
      default: true,
      describe: "observe garbage collection via perf_hooks",
    })
    .option("profile", {
      type: "boolean",
      default: false,
      describe: "run once, for attaching a profiler",
    })
    .option("manual", {
      type: "boolean",
      default: false,
      describe: "run using manual profiler",
    })
    .option("mitata", {
      type: "boolean",
      default: false,
      describe: "run using vanilla mitata profiler",
    })
    .option("filter", {
      type: "string",
      requiresArg: true,
      describe:
        "run only benchmarks matching this regex or substring (case-insensitive)",
    })
    .option("simple", {
      type: "string",
      requiresArg: true,
      describe:
        "benchmark a simple function, selected from SimpleTests.ts by prefix",
    })
    .help()
    .parseSync();
}

/** create benchmark options from CLI arguments */
function createBenchmarkOptions(argv: CliArgs): MeasureOptions {
  const { time, cpu, observeGc, collect } = argv;
  const secToNs = 1e9;
  return {
    min_cpu_time: time * secToNs,
    cpuCounters: cpu,
    observeGC: observeGc,
    inner_gc: collect,
  } as any;
}

/** run the selected benchmark variants */
async function runBenchmarks(argv: CliArgs): Promise<void> {
  const loadedTests = await loadBenchmarkFiles();
  const baselineLink = argv.baseline ? await loadBaselineLink() : undefined;

  const tests = filterBenchmarks(loadedTests, argv.filter);

  if (argv.profile) {
    await benchOnceOnly(tests);
  } else if (argv.mitata) {
    await simpleMitataBench(tests, [...argv.variant], argv.baseline);
  } else if (argv.manual) {
    benchManually(tests, baselineLink as any);
  } else {
    const opts = createBenchmarkOptions(argv);
    await benchAndReport(tests, opts, [...argv.variant], argv.baseline);
  }
}

/** run a simple benchmark against itself */
async function runSimpleBenchmarks(argv: CliArgs): Promise<void> {
  const { fn, name } = loadSimpleTest(argv.simple);
  const opts = createBenchmarkOptions(argv);

  const weslSrc = await loadSimpleFiles();
  console.log(`Benching simple test: ${name}`);

  const { current, baseline } = await runBenchmarkPair(
    () => fn(weslSrc),
    name,
    opts,
    () => fn(weslSrc),
  );

  const files = new Map(Object.entries(weslSrc));
  const benchTest: BenchTest = { name, mainFile: "N/A", files };
  const report: BenchmarkReport = {
    benchTest,
    mainResult: current,
    baseline: baseline,
  };

  reportResults([report], { cpu: argv.cpu });
}

/** run a benchmark with current and optional baseline implementations */
async function runBenchmarkPair(
  currentFn: () => any,
  testName: string,
  opts: MeasureOptions,
  baselineFn?: () => any,
): Promise<{ current: any; baseline?: any }> {
  const current = await mitataBench(currentFn, testName, opts);

  let baseline: MeasuredResults | undefined;
  if (baselineFn) {
    baseline = await mitataBench(baselineFn, "--> baseline", opts);
  }

  return { current, baseline };
}

/** run the the first selected benchmark, once, without any data collection.
 * useful for attaching the profiler, or for continuous integration */
function benchOnceOnly(tests: BenchTest[]): Promise<any> {
  return link({
    weslSrc: Object.fromEntries(tests[0].files.entries()),
    rootModuleName: tests[0].mainFile,
  });
}

/** run the tests and report results */
async function benchAndReport(
  tests: BenchTest[],
  opts: MeasureOptions,
  variants: ParserVariant[],
  useBaseline: boolean,
): Promise<void> {
  const allReports: BenchmarkReport[] = [];

  for (const variant of variants) {
    const variantFunctions = await createVariantFunction(variant, useBaseline);

    for (const test of tests) {
      const weslSrc = Object.fromEntries(test.files.entries());
      const rootModuleName = test.mainFile;

      // Use baseline from variant functions if available
      const baselineFn = variantFunctions.baseline;

      // Prefix test name with variant if it's not the default
      const testName =
        variant === "link" ? test.name : `(${variant}) ${test.name}`;

      const { current, baseline } = await runBenchmarkPair(
        () => variantFunctions.current({ weslSrc, rootModuleName }),
        testName,
        opts,
        baselineFn && (() => baselineFn({ weslSrc, rootModuleName })),
      );

      allReports.push({ benchTest: test, mainResult: current, baseline });
    }
  }

  reportResults(allReports, { cpu: opts.cpuCounters });
}

/** select which tests to run */
function filterBenchmarks(tests: BenchTest[], pattern?: string): BenchTest[] {
  if (!pattern) return tests;
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "i");
  } catch {
    // fallback to substring match if invalid regex
    regex = new RegExp(pattern.replace(/[.*+?^${}()|[[\\]/g, "\\$&"), "i");
  }
  const filtered = tests.filter(test => regex.test(test.name));
  if (filtered.length === 0) {
    console.error(`No benchmarks matched pattern: ${pattern}`);
    process.exit(1);
  }
  return filtered;
}
