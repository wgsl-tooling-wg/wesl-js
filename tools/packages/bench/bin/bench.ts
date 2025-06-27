import { _linkSync, link } from "wesl";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { type BenchmarkReport, reportResults } from "../src/BenchmarkReport.ts";
import { loadBenchmarkFiles } from "../src/LoadBenchmarks.ts";
import { benchManually } from "../src/experiments/BenchManually.ts";
import { simpleMitataBench } from "../src/experiments/VanillaMitata.ts";
import {
  type MeasureOptions,
  mitataBench,
} from "../src/mitata-util/MitataBench.ts";

export interface BenchTest {
  name: string;
  /** Path to the main file */
  mainFile: string;
  /** All relevant files (file paths and their contents) */
  files: Map<string, string>;
}

/** load the link() function from the baseline repo  */
async function loadBaselineLink(): Promise<typeof link | undefined> {
  return import("../_baseline/packages/wesl/src/index.ts")
    .then(x => x.link as unknown as typeof link)
    .catch(() => undefined);
}

type ParserVariant =
  | "wgsl-linker"
  | "wesl-link"
  | "wgsl_reflect"
  | "use-gpu"
  | "all"; // NYI

type CliArgs = ReturnType<typeof parseArgs>;

const rawArgs = hideBin(process.argv);
main(rawArgs);

async function main(args: string[]): Promise<void> {
  const argv = parseArgs(args);
  await runBenchmarks(argv);
}

function parseArgs(args: string[]) {
  return yargs(args)
    .option("variant", {
      choices: ["wgsl-linker", "wgsl_reflect", "use-gpu", "wesl-link"] as const,
      default: "wgsl-linker" as const,
      describe: "select parser to test",
    })
    .option("baseline", {
      type: "boolean",
      default: true,
      describe: "run baseline comparison using _baseline directory",
    })
    .option("bench-time", {
      type: "number",
      default: 0.5,
      describe: "benchmark duration in seconds",
    })
    .option("cpu", {
      type: "boolean",
      default: false,
      describe: "enable CPU counter measurements (requires root)",
    })
    .option("observe-gc", {
      type: "boolean",
      default: true,
      describe: "enable garbage collection observation via perf_hooks",
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
      describe: "run only benchmarks matching this regex or substring (case-insensitive)",
    })
    .help()
    .parseSync();
}

/** run the selected benchmark variants */
async function runBenchmarks(argv: CliArgs): Promise<void> {
  const loadedTests = await loadBenchmarkFiles();
  const baselineLink = argv.baseline ? await loadBaselineLink() : undefined;

  const tests = filterBenchmarks(loadedTests, argv.filter);

  if (argv.profile) {
    await benchOnceOnly(tests);
  } else if (argv.mitata) {
    simpleMitataBench(tests, baselineLink as any);
  } else if (argv.manual) {
    benchManually(tests, baselineLink as any);
  } else {
    await benchAndReport(tests, baselineLink, argv.benchTime, argv.cpu, argv.observeGc);
  }
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
  baselineLink?: typeof link,
  benchTimeSeconds = 0.5,
  cpuCounters = false,
  observeGc = true,
): Promise<void> {
  const reports: BenchmarkReport[] = [];

  const secToNs = 1e9;
  const opts: MeasureOptions = {
    // inner_gc: true,
    min_cpu_time: benchTimeSeconds * secToNs,
    cpuCounters,
    observeGC: observeGc,
  } as any;
  for (const test of tests) {
    const weslSrc = Object.fromEntries(test.files.entries());
    const rootModuleName = test.mainFile;

    const current = await mitataBench(
      () => _linkSync({ weslSrc, rootModuleName }),
      test.name,
      opts,
    );

    let old = undefined;
    if (baselineLink)
      old = await mitataBench(
        () => baselineLink({ weslSrc, rootModuleName }),
        "--> baseline",
        opts,
      );

    reports.push({ benchTest: test, mainResult: current, baseline: old });
  }

  reportResults(reports);
}

function selectVariant(variant: string): ParserVariant {
  if (
    ["wesl-link", "wgsl-linker", "wgsl_reflect", "use-gpu"].includes(variant)
  ) {
    return variant as ParserVariant;
  }
  throw new Error("NYI parser variant: " + variant);
}

/** select which tests to run */
function filterBenchmarks(tests: BenchTest[], pattern?: string): BenchTest[] {
  if (!pattern) return tests;
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, "i");
  } catch {
    // fallback to substring match if invalid regex
    regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  const filtered = tests.filter(test => regex.test(test.name));
  if (filtered.length === 0) {
    console.error(`No benchmarks matched pattern: ${pattern}`);
    process.exit(1);
  }
  return filtered;
}

// function runOnce(parserVariant: ParserVariant, test: BenchTest): void {
//   if (parserVariant === "wgsl-linker") {
//     for (const [_, text] of test.files) {
//       parseWESL(text);
//     }
//   } else if (parserVariant === "wesl-link") {
//     link({
//       weslSrc: Object.fromEntries(test.files.entries()),
//       rootModuleName: test.mainFile,
//     });
//   } else if (parserVariant === "wgsl_reflect") {
//     for (const [path, text] of test.files) {
//       wgslReflectParse(path, text);
//     }
//   } else if (parserVariant === "use-gpu") {
//     for (const [path, text] of test.files) {
//       useGpuParse(path, text);
//     }
//   } else {
//     throw new Error("NYI parser variant: " + parserVariant);
//   }
// }

// function wgslReflectParse(_filePath: string, text: string): void {
//   new WgslReflect(text);
// }

// function useGpuParse(_filePath: string, text: string): void {
//   WGSLLinker.loadModule(text);
// }
