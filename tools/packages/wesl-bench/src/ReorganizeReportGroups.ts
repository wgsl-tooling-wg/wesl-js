import type { BenchmarkReport, ReportGroup } from "bencher";
import type { ParserVariant } from "./ParserVariations.ts";

/**
 * Groups reports for table display with strategic blank lines.
 *
 * Single variant, no baseline: all in one group
 * Multiple variants: group by benchmark name
 * With baseline: pair each benchmark with its baseline
 * Multiple variants + baseline: baseline last in each group
 */
export function reorganizeReportGroups(
  results: ReportGroup[],
  variants: ParserVariant[],
): ReportGroup[] {
  const hasBaseline = results.some(g => g.baseline);

  if (variants.length === 1) {
    // Single variant with baseline: keep groups separate
    if (hasBaseline) {
      return results;
    }
    return mergeAllGroups(results);
  }

  // Multiple variants: group by benchmark
  return groupByBenchmark(results);
}

/** @return single group containing all reports */
function mergeAllGroups(groups: ReportGroup[]): ReportGroup[] {
  if (groups.length === 0) return [];

  const allReports = groups.flatMap(g => g.reports);
  const firstBaseline = groups.find(g => g.baseline)?.baseline;

  return [{ reports: allReports, baseline: firstBaseline }];
}

/** @return reports grouped by benchmark name */
function groupByBenchmark(groups: ReportGroup[]): ReportGroup[] {
  const allReports = flattenWithBaselines(groups);
  const byName = groupByBaseName(allReports);

  return [...byName.entries()].map(([_, reports]) => ({
    reports: reports.sort(
      (a, b) => variantOrder(a.name) - variantOrder(b.name),
    ),
  }));
}

/** @return flattened reports with baselines prefixed */
function flattenWithBaselines(groups: ReportGroup[]): BenchmarkReport[] {
  return groups.flatMap(g => {
    const baselineReports = g.baseline ? [markAsBaseline(g.baseline)] : [];
    return [...g.reports, ...baselineReports];
  });
}

/** @return reports by base name */
function groupByBaseName(
  reports: BenchmarkReport[],
): Map<string, BenchmarkReport[]> {
  return reports.reduce((acc, report) => {
    const baseName = extractBaseName(report.name);
    const existing = acc.get(baseName) ?? [];
    return acc.set(baseName, [...existing, report]);
  }, new Map());
}

/** @return report with --> prefix */
function markAsBaseline(report: BenchmarkReport): BenchmarkReport {
  return {
    ...report,
    name: `--> ${report.name}`,
  };
}

/** @return name without variant suffix */
function extractBaseName(name: string): string {
  const cleanName = name.replace(/^--> /, "");
  return cleanName.replace(/ \[.*?\]$/, "");
}

/** @return sort order for benchmark variants */
function variantOrder(name: string): number {
  const isBaseline = name.startsWith("-->");
  const cleanName = name.replace(/^--> /, "");

  // Determine base order by variant type
  let baseOrder = 4; // link variant (no suffix)
  if (cleanName.includes("[tokenize]")) baseOrder = 0;
  else if (cleanName.includes("[parse]")) baseOrder = 2;

  // Baselines come immediately after their variant
  return isBaseline ? baseOrder + 1 : baseOrder;
}
