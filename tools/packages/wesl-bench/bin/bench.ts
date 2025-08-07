#!/usr/bin/env -S node --expose-gc --allow-natives-syntax
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BenchGroup,
  type BenchSuite,
  defaultCliArgs,
  parseBenchArgs,
  reportResults,
  runBenchmarks,
  runsSection,
  timeSection,
} from "bencher";
import { loadExamples, type WeslSource } from "../src/LoadExamples.ts";
import { locSection } from "../src/LocSection.ts";
import {
  type ParserVariant,
  parserVariation,
} from "../src/ParserVariations.ts";
import { reorganizeReportGroups } from "../src/ReorganizeReportGroups.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const examplesDir = join(__dirname, "..", "wesl-examples");

main();

async function main() {
  const args = parseArgs();
  const variants = args.variant as ParserVariant[];

  const examples = loadExamples(examplesDir);
  const suite: BenchSuite = {
    name: "WESL Benchmarks",
    groups: createBenchGroups(variants, examples),
  };

  const results = await runBenchmarks(suite, args);
  const reorganized = reorganizeReportGroups(results, variants);
  const sections = [timeSection, runsSection, locSection];
  const table = reportResults(reorganized, sections);
  console.log(table);
}

/** @return parsed CLI arguments with custom variant option */
function parseArgs() {
  return parseBenchArgs(yargs =>
    defaultCliArgs(yargs).option("variant", {
      type: "array",
      choices: ["link", "parse", "tokenize"] as const,
      default: ["link"],
      describe: "Parser variant(s) to benchmark",
    }),
  );
}

/** @return benchmark groups for all requested variants */
function createBenchGroups(
  variants: ParserVariant[],
  examples: Record<string, WeslSource>,
): BenchGroup[] {
  const entries = Object.entries(examples);
  const exampleList = entries.map(([name, source]) => ({ name, source }));

  return variants.flatMap(variant =>
    exampleList.map(({ name, source }) => makeBenchmark(name, source, variant)),
  );
}

/** @return a benchmark group with metadata for lines/sec calculation */
function makeBenchmark(
  name: string,
  source: WeslSource,
  variant: ParserVariant,
) {
  const fn = parserVariation(variant);
  const benchName = variant === "link" ? name : `${name} [${variant}]`;

  return {
    name: benchName,
    benchmarks: [{ name: benchName, fn: () => fn(source) }],
    metadata: { linesOfCode: source.lineCount ?? 0 },
  };
}
