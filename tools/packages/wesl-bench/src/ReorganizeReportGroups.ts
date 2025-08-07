import type { BenchmarkReport, ReportGroup } from "bencher";
import type { ParserVariant } from "./ParserVariations.ts";

/**
 * Reorganize report groups for optimal table display with blank line placement.
 *
 * Report grouping behaviors:
 *
 * 1. Default (single variant, no baseline):
 *    bevy              55    ...
 *    reduceBuffer      23    ...
 *    anotherBench      18    ...
 *    → All benchmarks in one group, no blank lines
 *
 * 2. Multiple variants (e.g., --variant tokenize --variant parse):
 *    bevy [tokenize]   6.75  ...
 *    bevy [parse]      49    ...
 *                                  <- blank line between benchmarks
 *    reduceBuffer [tokenize]  3.2  ...
 *    reduceBuffer [parse]     11   ...
 *    → Variants grouped by benchmark, blank lines between different benchmarks
 *
 * 3. Single variant with baseline (--baseline):
 *    bevy              53    ...
 *    --> baseline      45    ...
 *                                  <- blank line between benchmarks
 *    reduceBuffer      23    ...
 *    --> baseline      12    ...
 *    → Each benchmark paired with its baseline, blank lines between pairs
 *
 * 4. Multiple variants with baseline:
 *    bevy [tokenize]   6.75  ...
 *    bevy [parse]      49    ...
 *    bevy              55    ...
 *    --> bevy          45    ...
 *                                  <- blank line between benchmarks
 *    reduceBuffer [tokenize]  3.2  ...
 *    reduceBuffer [parse]     11   ...
 *    reduceBuffer             23   ...
 *    --> reduceBuffer         12   ...
 *    → Baseline included as last variant in each benchmark group
 */
export function reorganizeReportGroups(
  results: ReportGroup[],
  variants: ParserVariant[],
): ReportGroup[] {
  const hasBaseline = results.some(g => g.baseline);

  if (variants.length === 1) {
    // Single variant with baseline: keep groups separate for each benchmark+baseline pair
    if (hasBaseline) {
      return results;
    }
    // Single variant without baseline: merge all groups into one
    return mergeAllGroups(results);
  }

  // Multiple variants: group by benchmark (including baseline as a variant)
  return groupByBenchmark(results);
}

/** @return all report groups merged into a single group */
function mergeAllGroups(groups: ReportGroup[]): ReportGroup[] {
  if (groups.length === 0) return [];

  const allReports = groups.flatMap(g => g.reports);
  const firstBaseline = groups.find(g => g.baseline)?.baseline;

  return [{ reports: allReports, baseline: firstBaseline }];
}

/** @return reports grouped by benchmark name with ordered variants */
function groupByBenchmark(groups: ReportGroup[]): ReportGroup[] {
  const allReports = flattenWithBaselines(groups);
  const byName = groupByBaseName(allReports);

  return [...byName.entries()].map(([_, reports]) => ({
    reports: reports.sort(
      (a, b) => variantOrder(a.name) - variantOrder(b.name),
    ),
  }));
}

/** @return flattened reports with baselines marked with prefix */
function flattenWithBaselines(groups: ReportGroup[]): BenchmarkReport[] {
  return groups.flatMap(g => {
    const baselineReports = g.baseline ? [markAsBaseline(g.baseline)] : [];
    return [...g.reports, ...baselineReports];
  });
}

/** @return reports grouped by base benchmark name */
function groupByBaseName(
  reports: BenchmarkReport[],
): Map<string, BenchmarkReport[]> {
  return reports.reduce((acc, report) => {
    const baseName = extractBaseName(report.name);
    const existing = acc.get(baseName) ?? [];
    return acc.set(baseName, [...existing, report]);
  }, new Map());
}

/** @return baseline report marked with --> prefix */
function markAsBaseline(report: BenchmarkReport): BenchmarkReport {
  return {
    ...report,
    name: `--> ${report.name}`,
  };
}

/** @return base benchmark name without variant suffix */
function extractBaseName(name: string): string {
  const cleanName = name.replace(/^--> /, "");
  return cleanName.replace(/ \[(tokenize|parse)\]$/, "");
}

/** @return sort order for benchmark variants */
function variantOrder(name: string): number {
  if (name.startsWith("-->")) return 3; // baseline last
  if (name.includes("[tokenize]")) return 0;
  if (name.includes("[parse]")) return 1;
  return 2; // link variant (no suffix)
}
