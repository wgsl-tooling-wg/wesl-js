import type { BenchmarkReport as GenericReport } from "../BenchmarkReport.ts";
import type { BenchmarkReport } from "../RunBenchmark.ts";
import { calculateLinesOfCode } from "./LinesOfCode.ts";

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
          ? calculateLinesOfCode(report.test.metadata.weslBenchTest)
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

