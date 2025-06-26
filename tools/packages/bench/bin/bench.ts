import fs from "node:fs/promises";
import path from "node:path";
import {
  _linkSync,
  link
} from "wesl";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  type BenchmarkReport,
  reportResults,
} from "../src/BenchmarkReport.ts";
import { type MeasureOptions, mitataBench } from "../src/MitataBench.ts";
import { benchManually } from "../src/experiments/BenchManually.ts";
import { simpleMitataBench } from "../src/experiments/VanillaMitata.ts";

export interface BenchTest {
  name: string;
  /** Path to the main file */
  mainFile: string;
  /** All relevant files (file paths and their contents) */
  files: Map<string, string>;
}

/** load the link() function from the baseline repo  */
const baselineLink = await import("../_baseline/packages/wesl/src/index.ts")
  .then(x => x.link)
  .catch(() => undefined);

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
  const tests = await loadAllFiles();

  if (argv.manual) {
    benchManually(tests, baselineLink as any);
  } else if (argv.profile) {
    await benchOnceOnly(tests);
  } else if (argv.mitata) {
    simpleMitataBench(tests, baselineLink as any);
  } else {
    await benchAndReport(tests);
  }
}

function benchOnceOnly(tests: BenchTest[]): Promise<any> {
  return link({
    weslSrc: Object.fromEntries(tests[0].files.entries()),
    rootModuleName: tests[0].mainFile,
  });
}


/** run the tests and report results */
async function benchAndReport(tests: BenchTest[]): Promise<void> {
  const reports: BenchmarkReport[] = [];

  const secToNs = 1e9;
  const opts: MeasureOptions = {
    // inner_gc: true,
    min_cpu_time: 3 * secToNs,
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

async function loadAllFiles(): Promise<BenchTest[]> {
  const examplesDir = "./src/examples";
  const reduceBuffer = await loadBench(
    "reduceBuffer",
    examplesDir,
    "./reduceBuffer.wgsl",
  );
  const particle = await loadBench("particle", examplesDir, "./particle.wgsl");
  const rasterize = await loadBench(
    "rasterize",
    examplesDir,
    "./rasterize_05_fine.wgsl",
  );
  const boat = await loadBench(
    "unity_webgpu_0000026E5689B260",
    examplesDir,
    "./unity_webgpu_000002B8376A5020.fs.wgsl",
  );
  const imports_only = await loadBench(
    "imports_only",
    examplesDir,
    "./imports_only.wgsl",
  );
  const bevy_deferred_lighting = await loadBench(
    "bevy_deferred_lighting",
    "./src/examples/bevy",
    "./bevy_generated_deferred_lighting.wgsl",
  );
  const bevy_linking = await loadBench(
    "bevy_linking",
    "./src/examples/naga_oil_example",
    "./pbr.wgsl",
    [
      "./clustered_forward.wgsl",
      "./mesh_bindings.wgsl",
      "./mesh_types.wgsl",
      "./mesh_vertex_output.wgsl",
      "./mesh_view_bindings.wgsl",
      "./mesh_view_types.wgsl",
      "./pbr_bindings.wgsl",
      "./pbr_functions.wgsl",
      "./pbr_lighting.wgsl",
      "./pbr_types.wgsl",
      "./shadows.wgsl",
      "./utils.wgsl",
    ],
  );
  return [
    reduceBuffer,
    // particle,
    // rasterize,
    boat,
    // imports_only,
    // bevy_deferred_lighting,
    // bevy_linking,
  ];
}

async function loadBench(
  name: string,
  cwd: string,
  mainFile: string,
  extraFiles: string[] = [],
): Promise<BenchTest> {
  const files = new Map<string, string>();
  const addFile = async (p: string) =>
    files.set(p, await fs.readFile(path.join(cwd, p), { encoding: "utf8" }));

  await addFile(mainFile);
  for (const path of extraFiles) {
    await addFile(path);
  }
  return { name, mainFile, files };
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