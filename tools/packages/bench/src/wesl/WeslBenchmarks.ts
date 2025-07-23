/**
 * WESL-specific benchmark setup and configuration
 */

import path from "node:path";
import type { link } from "wesl";
import type { BenchTest as BenchTestInterface } from "../Benchmark.ts";
import type { ParserVariant } from "./BenchVariations.ts";
import { loadWeslFiles } from "./LoadWeslFiles.ts";
import { createWeslBenchTest, type WeslParams } from "./WeslBenchTest.ts";

/** Directory for baseline linkSync implementations */
export const baselineDir = "../../../../../_baseline";

/** WESL-specific benchmark test definition */
export interface BenchTest {
  /** name of the test */
  name: string;

  /** Path to the main file */
  mainFile: string;

  /** All relevant files (file paths and their contents) */
  files: Map<string, string>;
}

/** Default parser variants to test */
const DEFAULT_VARIANTS: ParserVariant[] = ["link"];

/** Available parser variants */
const ALL_VARIANTS: ParserVariant[] = [
  "link",
  "parse",
  "tokenize",
  "wgsl_reflect",
];

/**
 * Setup WESL benchmarks based on configuration
 */
export async function setupWeslBenchmarks(
  filter?: string,
  variants: ParserVariant[] = DEFAULT_VARIANTS,
  useBaseline = false,
): Promise<BenchTestInterface<WeslParams>[]> {
  // Load benchmark test files
  const weslTests = await loadWeslFiles();

  // Filter tests if requested
  const filteredTests = filter
    ? weslTests.filter(test => test.name.includes(filter))
    : weslTests;

  // Convert to benchmark tests
  const benchTests: BenchTestInterface<WeslParams>[] = [];

  for (const test of filteredTests) {
    const benchTest = await createWeslBenchTest(test, variants, useBaseline);
    benchTests.push(benchTest);
  }

  return benchTests;
}

/**
 * Load the baseline link function if available
 */
async function loadBaselineLink(): Promise<typeof link | undefined> {
  const baselinePath = path.join(baselineDir, "packages/wesl/src/index.ts");

  return import(baselinePath)
    .then(x => x.link as unknown as typeof link)
    .catch(() => undefined);
}

/**
 * Validate requested variants
 */
export function validateVariants(variants: string[]): ParserVariant[] {
  const valid: ParserVariant[] = [];

  for (const variant of variants) {
    if (ALL_VARIANTS.includes(variant as ParserVariant)) {
      valid.push(variant as ParserVariant);
    } else {
      console.warn(`Unknown variant: ${variant}`);
    }
  }

  return valid.length > 0 ? valid : DEFAULT_VARIANTS;
}

/**
 * Get variant display name
 */
function getVariantDisplayName(variant: ParserVariant): string {
  switch (variant) {
    case "link":
      return "Full Link";
    case "parse":
      return "Parse Only";
    case "tokenize":
      return "Tokenize Only";
    case "wgsl_reflect":
      return "WGSL Reflect";
    case "use-gpu":
      return "Use GPU";
    default:
      return variant;
  }
}
