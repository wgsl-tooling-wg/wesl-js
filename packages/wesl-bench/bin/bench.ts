#!/usr/bin/env -S node --expose-gc --allow-natives-syntax
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type BenchMatrix,
  defaultCliArgs,
  gcSections,
  getBaselineVersion,
  getCurrentGitVersion,
  matrixBenchExports,
  type MatrixSuite,
  parseBenchArgs,
  type ReportSection,
  runsSection,
} from "benchforge";
import { baselineDir, hasBaselineModule } from "../src/BaselineVariations.ts";
import { ensureBevyFixture, type WeslSource } from "../src/LoadExamples.ts";
import { locSection } from "../src/LocSection.ts";

type BenchArgs = ReturnType<typeof parseArgs>;

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(__dirname, "..", "fixtures");

main();

async function main() {
  const args = parseArgs();

  await ensureBevyFixture(fixturesDir);
  const hasBaseline = args.baseline && hasBaselineModule();
  if (args.baseline && !hasBaseline) {
    console.warn(
      "--baseline: no baseline found. Run `pnpm bench:baseline <version>` first.",
    );
  }

  const matrix: BenchMatrix<WeslSource> = {
    name: "WESL Parser",
    variantDir: new URL("../src/variants/", import.meta.url).href,
    casesModule: new URL("../src/Cases.ts", import.meta.url).href,
    baselineDir: hasBaseline
      ? new URL("../src/baseline/", import.meta.url).href
      : undefined,
  };

  const suite: MatrixSuite = { name: "WESL Benchmarks", matrices: [matrix] };
  const sections = buildSections(args);
  const currentVersion = getCurrentGitVersion();
  const baselineVersion = args.baseline ? findBaselineVersion() : undefined;

  await matrixBenchExports(
    suite,
    args,
    { sections, variantTitle: "name" },
    { sections, currentVersion, baselineVersion },
  );
}

/** @return parsed CLI arguments */
function parseArgs() {
  return parseBenchArgs(yargs =>
    defaultCliArgs(yargs).option("baseline", {
      type: "boolean",
      default: false,
      describe: "Compare against baseline version in _baseline/ directory",
    }),
  );
}

/** Build report sections based on CLI options */
function buildSections(args: BenchArgs): ReportSection[] {
  return [locSection, ...gcSections(args), runsSection];
}

/** @return baseline git version, or a fallback if not found */
function findBaselineVersion() {
  return getBaselineVersion(baselineDir) ?? { hash: "unknown", date: "" };
}
