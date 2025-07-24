import type { BenchmarkReport as GenericReport } from "../BenchmarkReport.ts";
import type { BenchmarkReport } from "../RunBenchmark.ts";
import type { BenchTest as WeslBenchTest } from "./WeslBenchmarks.ts";

/**
 * Convert generic reports to WESL format for reporting
 */
export function convertToWeslReports<T>(
  reports: BenchmarkReport<T>[],
): GenericReport[] {
  const weslReports: GenericReport[] = [];

  for (const report of reports) {
    for (const result of report.results) {
      // Extract lines of code from metadata if available
      const linesOfCode =
        report.test.metadata?.linesOfCode ||
        (report.test.metadata?.weslBenchTest
          ? calculateLinesFromWeslTest(report.test.metadata.weslBenchTest)
          : 0);

      weslReports.push({
        name: result.spec.name,
        mainResult: result.mainResult,
        baseline: result.baselineResult,
        metadata: {
          ...report.test.metadata,
          linesOfCode,
        },
      });
    }
  }

  return weslReports;
}

function calculateLinesFromWeslTest(benchTest: WeslBenchTest): number {
  return [...benchTest.files.values()]
    .map(code => code.split("\n").length)
    .reduce((a, b) => a + b, 0);
}
