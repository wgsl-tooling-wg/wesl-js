import { WGSLLinker } from "@use-gpu/shader";
import fs from "fs/promises";
import { link, parseWESL } from "wesl";
import { WgslReflect } from "wgsl_reflect";
import yargs from "yargs";

import { hideBin } from "yargs/helpers";

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
  await bench(argv);
}

function parseArgs(args: string[]) {
  return yargs(args)
    .option("bench", {
      type: "boolean",
      default: false,
      describe: "run a benchmark, collecting timings",
    })
    .option("variant", {
      choices: ["wgsl-linker", "wgsl_reflect", "use-gpu", "wesl-link"] as const,
      default: "wgsl-linker",
      describe: "select parser to test",
    })
    .option("profile", {
      type: "boolean",
      default: false,
      describe: "run once, for attaching a profiler",
    })
    .help()
    .parseSync();
}

async function bench(argv: CliArgs): Promise<void> {
  const texts = await loadAllFiles();
  const variant: ParserVariant = selectVariant(argv.variant);

  if (argv.bench) {
    for (const file of texts) {
      const ms = runBench(variant, file);
      const codeLines = file.text.split("\n").length;
      const locSec = codeLines / ms;
      const locSecStr = new Intl.NumberFormat("en-US").format(
        Math.round(locSec),
      );
      console.log(`${variant} ${file.name} LOC/sec: ${locSecStr}`);
    }
  }

  if (argv.profile) {
    console.profile();
    runOnAllFiles(variant, texts);
    console.profileEnd();
  }
}

function selectVariant(variant: string): ParserVariant {
  if (
    ["wesl-link", "wgsl-linker", "wgsl_reflect", "use-gpu"].includes(variant)
  ) {
    return variant as ParserVariant;
  }
  throw new Error("NYI parser variant: " + variant);
}

function runBench(variant: ParserVariant, file: LoadedFile): number {
  const warmupIterations = 5;
  const benchIterations = 20;

  // TODO try e.g. TinyBench instead

  /* warmup */
  runNTimes(warmupIterations, variant, file);

  /* test */
  const start = performance.now();
  runNTimes(benchIterations, variant, file);
  const ns = performance.now() - start;
  const ms = ns / benchIterations / 1000;
  return ms;
}

function runNTimes(n: number, variant: ParserVariant, file: LoadedFile): void {
  for (let i = 0; i < n; i++) {
    parseOnce(variant, file.name, file.text);
  }
}

function runOnAllFiles(variant: ParserVariant, files: LoadedFile[]): void {
  for (const file of files) {
    parseOnce(variant, file.name, file.text);
  }
}

interface LoadedFile {
  name: string;
  text: string;
}

async function loadAllFiles(): Promise<LoadedFile[]> {
  const reduceBuffer = await loadFile(
    "reduceBuffer",
    "./src/examples/reduceBuffer.wgsl",
  );
  const particle = await loadFile("particle", "./src/examples/particle.wgsl");
  const rasterize = await loadFile(
    "rasterize",
    "./src/examples/rasterize_05_fine.wgsl",
  );
  const boat = await loadFile(
    "unity_webgpu_0000026E5689B260",
    "./src/examples/unity_webgpu_000002B8376A5020.fs.wgsl",
  );
  const imports_only = await loadFile(
    "imports_only",
    "./src/examples/imports_only.wgsl",
  );
  return [reduceBuffer, particle, rasterize, boat, imports_only];
}

async function loadFile(name: string, path: string): Promise<LoadedFile> {
  const text = await fs.readFile(path, { encoding: "utf8" });

  return { name, text };
}

function parseOnce(
  parserVariant: ParserVariant,
  filePath: string,
  text: string,
): void {
  if (parserVariant === "wgsl-linker") {
    parseWESL(text);
  } else if (parserVariant === "wesl-link") {
    link({ weslSrc: { [filePath]: text }, rootModuleName: filePath });
  } else if (parserVariant === "wgsl_reflect") {
    wgslReflectParse(filePath, text);
  } else if (parserVariant === "use-gpu") {
    useGpuParse(filePath, text);
  } else {
    throw new Error("NYI parser variant: " + parserVariant);
  }
}

function wgslReflectParse(_filePath: string, text: string): void {
  new WgslReflect(text);
}

function useGpuParse(_filePath: string, text: string): void {
  WGSLLinker.loadModule(text);
}
