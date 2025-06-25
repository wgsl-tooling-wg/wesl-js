import fs from "node:fs/promises";
import path from "node:path";
import { WGSLLinker } from "@use-gpu/shader";
import * as mitata from "mitata";
import {
  type SrcModule,
  type WeslAST,
  _linkSync,
  link,
  parseSrcModule,
} from "wesl";
import { WgslReflect } from "wgsl_reflect";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  type BenchmarkReport,
  coloredPercent,
  reportResults,
} from "../src/BenchResults.ts";
import { type MeasureOptions, mitataBench } from "../src/MitataBench.ts";

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
  const variant: ParserVariant = selectVariant(argv.variant);

  if (argv.manual) {
    benchManually(tests);
  } else if (argv.profile) {
    await benchOnceOnly(tests);
  } else if (argv.mitata) {
    simpleMitataBench(tests);
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

function simpleMitataBench(tests: BenchTest[]): void {
  for (const test of tests) {
    const weslSrc = Object.fromEntries(test.files.entries());
    const rootModuleName = test.mainFile;

    mitata.bench("--> baseline " + test.name, () =>
      baselineLink!({ weslSrc, rootModuleName }),
    );
    mitata.bench(test.name, () => _linkSync({ weslSrc, rootModuleName }));
  }
  mitata.run();
}

/** run the tests once to verify they run, or to attach a profiler */
function benchManually(tests: BenchTest[]): void {
  const gc = globalThis.gc || (() => {});
  console.log("gc is", globalThis.gc ? "enabled" : "disabled");
  for (const test of tests) {
    const weslSrc = Object.fromEntries(test.files.entries());
    const rootModuleName = test.mainFile;
    const warmups = 400;
    const runs = 200;
    const times = new Array<bigint>(runs).fill(0n);
    let baselineTime = 0;

    if (baselineLink) {
      for (let i = 0; i < warmups; i++) {
        baselineLink({ weslSrc, rootModuleName });
      }
      for (let i = 0; i < runs; i++) {
        gc();
        const start = process.hrtime.bigint();
        baselineLink({ weslSrc, rootModuleName });
        const time = process.hrtime.bigint() - start;
        times[i] = time;
      }
      baselineTime = medianTime(times);
    }

    for (let i = 0; i < warmups; i++) {
      // simpleTest(weslSrc);
      _linkSync({ weslSrc, rootModuleName });
    }

    for (let i = 0; i < runs; i++) {
      gc();
      const start = process.hrtime.bigint();
      _linkSync({ weslSrc, rootModuleName });
      const time = process.hrtime.bigint() - start;
      times[i] = time;
    }
    const mainTime = medianTime(times);

    const diff = coloredPercent(baselineTime - mainTime, baselineTime);
    console.log(`main: ${mainTime}ms, baseline: ${baselineTime}ms, ${diff}`);
  }
}

function meanTime(times: bigint[]): number {
  const total = times.reduce((acc, time) => acc + Number(time), 0);
  return total / times.length / 1e6;
}

function medianTime(times: bigint[]): number {
  const sorted = [...times].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(sorted.length / 2);
  return Number(sorted[mid]) / 1e6;
}

function simpleTest(weslSrc: Record<string, string>): number {
  let sum = 0;
  for (const [_, text] of Object.entries(weslSrc)) {
    for (const c of text) {
      sum += c.charCodeAt(0);
    }
  }
  return sum;
}

/** run the tests and report results */
async function benchAndReport(tests: BenchTest[]): Promise<void> {
  const reports: BenchmarkReport[] = [];

  const secToNs = 1e9;
  const opts: MeasureOptions = {
    // inner_gc: true,
    // min_cpu_time: 0.5 * secToNs,
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

export interface BenchTest {
  name: string;
  /** Path to the main file */
  mainFile: string;
  /** All relevant files (file paths and their contents) */
  files: Map<string, string>;
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

function runOnce(parserVariant: ParserVariant, test: BenchTest): void {
  if (parserVariant === "wgsl-linker") {
    for (const [_, text] of test.files) {
      parseWESL(text);
    }
  } else if (parserVariant === "wesl-link") {
    link({
      weslSrc: Object.fromEntries(test.files.entries()),
      rootModuleName: test.mainFile,
    });
  } else if (parserVariant === "wgsl_reflect") {
    for (const [path, text] of test.files) {
      wgslReflectParse(path, text);
    }
  } else if (parserVariant === "use-gpu") {
    for (const [path, text] of test.files) {
      useGpuParse(path, text);
    }
  } else {
    throw new Error("NYI parser variant: " + parserVariant);
  }
}

function runBaseline(test: BenchTest): void {
  if (!baselineLink) return;
  baselineLink({
    weslSrc: Object.fromEntries(test.files.entries()),
    rootModuleName: test.mainFile,
  });
}

function wgslReflectParse(_filePath: string, text: string): void {
  new WgslReflect(text);
}

function useGpuParse(_filePath: string, text: string): void {
  WGSLLinker.loadModule(text);
}

/** parse a single wesl file */ // DRY with TestUtil
export function parseWESL(src: string): WeslAST {
  const srcModule: SrcModule = {
    modulePath: "package::test", // TODO this ought not be used outside of tests
    debugFilePath: "./test.wesl",
    src,
  };

  return parseSrcModule(srcModule);
}
