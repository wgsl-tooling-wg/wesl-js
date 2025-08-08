#!/usr/bin/env -S node --expose-gc --allow-natives-syntax
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BenchGroup,
  type BenchSuite,
  cpuSection,
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
  makeVariation,
  type ParserVariant,
  parserVariation,
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

  const hasCpuData = results.some(({ reports }) =>
    reports.some(({ measuredResults }) => measuredResults.cpu !== undefined),
  );

  const sections = hasGcData(results)
    ? [locSection, meanTimeSection, gcSection, runsSection]
    : [locSection, meanTimeSection, runsSection];

  // Add CPU section if CPU data is available
  const finalSections = hasCpuData
    ? [...sections.slice(0, -1), cpuSection, sections[sections.length - 1]]
    : sections;

  const table = reportResults(reorganized, finalSections);
  console.log(table);
}

/** @return true if results contain GC data */
function hasGcData(results: ReportGroup[]): boolean {
  return results.some(({ reports }) =>
    reports.some(
      ({ measuredResults }) => measuredResults.nodeGcTime !== undefined,
    ),
  );
}

/** @return parsed CLI arguments */
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

/** @return benchmark groups for requested variants */
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

/** @return benchmark group with lines/sec metadata */
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
      benchmarks: [
        {
          name: benchName,
          fn: () => {}, // unused with modulePath
          modulePath: workerModulePath,
          exportName: "runBenchmark",
        },
      ],
      metadata: { linesOfCode: source.lineCount ?? 0 },
    };

    if (baselineImports) {
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
    const baselineFn = makeVariation(variant, baselineImports);
    group.baseline = {
      name: benchName, // table formatter adds --> prefix
      fn: () => baselineFn(source),
    };
  }

  return group;
}
