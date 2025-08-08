#!/usr/bin/env -S node --expose-gc --allow-natives-syntax
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BenchGroup,
  type BenchSuite,
  defaultCliArgs,
  gcSection,
  parseBenchArgs,
  type ReportGroup,
  reportResults,
  runBenchmarks,
  runsSection,
} from "bencher";
import { loadBaselineImports } from "../src/BaselineVariations.ts";
import { loadExamples, type WeslSource } from "../src/LoadExamples.ts";
import { locSection } from "../src/LocSection.ts";
import { meanTimeSection } from "../src/MeanTimeSection.ts";
import {
  type ParserVariant,
  parserVariation,
  parserVariationWithImports,
  type WeslImports,
} from "../src/ParserVariations.ts";
import { reorganizeReportGroups } from "../src/ReorganizeReportGroups.ts";
import type { BenchParams } from "../src/WorkerBenchmarks.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const examplesDir = join(__dirname, "..", "wesl-examples");

main();

async function main() {
  const args = parseArgs();
  const variants = args.variant as ParserVariant[];

  const baselineImports = await loadBaselineImports(args);
  const examples = loadExamples(examplesDir);
  const suite: BenchSuite = {
    name: "WESL Benchmarks",
    groups: createBenchGroups(variants, examples, baselineImports, args.worker),
  };

  const results = await runBenchmarks(suite, args);

  const reorganized = reorganizeReportGroups(results, variants);
  const sections = hasGcData(results)
    ? [locSection, meanTimeSection, gcSection, runsSection]
    : [locSection, meanTimeSection, runsSection];

  const table = reportResults(reorganized, sections);
  console.log(table);
}

/** @return true if any benchmark result contains GC data */
function hasGcData(results: ReportGroup[]): boolean {
  return results.some(({ reports }) =>
    reports.some(
      ({ measuredResults }) => measuredResults.nodeGcTime !== undefined,
    ),
  );
}

/** @return parsed CLI arguments with custom variant option */
function parseArgs() {
  return parseBenchArgs(yargs =>
    defaultCliArgs(yargs)
      .option("variant", {
        type: "array",
        choices: ["link", "parse", "tokenize", "wgsl-reflect"] as const,
        default: ["link"],
        describe: "Parser variant(s) to benchmark",
      })
      .option("baseline", {
        type: "boolean",
        default: false,
        describe: "Compare against baseline version in _baseline/ directory",
      }),
  );
}

/** @return benchmark groups for all requested variants */
function createBenchGroups(
  variants: ParserVariant[],
  examples: Record<string, WeslSource>,
  baselineImports?: WeslImports,
  useWorker?: boolean,
): BenchGroup[] {
  const entries = Object.entries(examples);
  const exampleList = entries.map(([name, source]) => ({ name, source }));

  return variants.flatMap(variant =>
    exampleList.map(({ name, source }) =>
      makeBenchGroup(name, source, variant, baselineImports, useWorker),
    ),
  );
}

/** @return a benchmark group with metadata for lines/sec calculation */
function makeBenchGroup(
  name: string,
  source: WeslSource,
  variant: ParserVariant,
  baselineImports?: WeslImports,
  useWorker?: boolean,
): BenchGroup {
  const benchName = variant === "link" ? name : `${name} [${variant}]`;

  if (useWorker) {
    // Worker mode: use module path and params
    const workerModulePath = join(__dirname, "../src/WorkerBenchmarks.ts");
    
    const group: BenchGroup<BenchParams> = {
      name: benchName,
      setup: () => ({ variant, source }),
      benchmarks: [{
        name: benchName,
        fn: () => {}, // Placeholder - not used when modulePath is provided
        modulePath: workerModulePath,
        exportName: "runBenchmark",
      }],
      metadata: { linesOfCode: source.lineCount ?? 0 },
    };

    if (baselineImports) {
      // Use separate baseline worker module that imports from _baseline directory
      group.baseline = {
        name: benchName,
        fn: () => {}, // Placeholder - not used when modulePath is provided
        modulePath: join(__dirname, "../src/BaselineWorkerBenchmarks.ts"),
        exportName: "runBaselineBenchmark",
      };
    }

    return group as BenchGroup;
  }

  // Non-worker mode: use closures
  const benchFn = parserVariation(variant);
  const group: BenchGroup = {
    name: benchName,
    benchmarks: [{ name: benchName, fn: () => benchFn(source) }],
    metadata: { linesOfCode: source.lineCount ?? 0 },
  };

  if (baselineImports) {
    const baselineFn = parserVariationWithImports(variant, baselineImports);
    group.baseline = {
      name: benchName, // Same name; table formatter will add --> prefix
      fn: () => baselineFn(source),
    };
  }

  return group;
}
