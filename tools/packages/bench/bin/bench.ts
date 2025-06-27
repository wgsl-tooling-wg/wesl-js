import { _linkSync, link } from "wesl";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { type BenchmarkReport, reportResults } from "../src/BenchmarkReport.ts";
import {
  type MeasureOptions,
  mitataBench,
} from "../src/mitata-util/MitataBench.ts";
import { benchManually } from "../src/experiments/BenchManually.ts";
import { simpleMitataBench } from "../src/experiments/VanillaMitata.ts";
import { loadBenchmarkFiles } from "../src/LoadBenchmarks.ts";

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
    .help()
    .parseSync();
}

async function runBenchmarks(argv: CliArgs): Promise<void> {
  const tests = await loadBenchmarkFiles();
  const baselineLink = argv.baseline ? await loadBaselineLink() : undefined;

  if (argv.manual) {
    benchManually(tests, baselineLink as any);
  } else if (argv.profile) {
    await benchOnceOnly(tests);
  } else if (argv.mitata) {
    simpleMitataBench(tests, baselineLink as any);
  } else {
    await benchAndReport(tests, baselineLink);
  }
}

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
): Promise<void> {
  const reports: BenchmarkReport[] = [];

  const secToNs = 1e9;
  const opts: MeasureOptions = {
    // inner_gc: true,
    min_cpu_time: 0.1 * secToNs,
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
