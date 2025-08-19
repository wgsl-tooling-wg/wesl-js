import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import open from "open";
import type { ReportGroup } from "../BenchmarkReport.ts";
import { generateHtmlDocument } from "./HtmlTemplate.ts";

export interface HtmlReportOptions {
  openBrowser: boolean;
  outputPath?: string;
}

export interface ReportData {
  groups: GroupData[];
  metadata: {
    timestamp: string;
    bencherVersion: string;
  };
}

export interface GroupData {
  baseline?: BenchmarkData;
  benchmarks: BenchmarkData[];
}

export interface BenchmarkData {
  name: string;
  samples: number[];
  stats: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p75: number;
    p99: number;
    p999: number;
  };
}

/** Generate HTML report and optionally open in browser */
export async function generateHtmlReport(
  groups: ReportGroup[],
  options: HtmlReportOptions,
): Promise<string> {
  const reportData = prepareReportData(groups);
  const html = generateHtmlDocument(reportData);

  const htmlPath = options.outputPath || (await createTempHtmlFile());
  await writeFile(htmlPath, html, "utf-8");

  if (options.openBrowser) {
    await open(htmlPath);
    console.log(`Report opened in browser: ${htmlPath}`);
  } else {
    console.log(`Report saved to: ${htmlPath}`);
  }

  return htmlPath;
}

/** Create temporary HTML file */
async function createTempHtmlFile(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "bencher-"));
  return join(tempDir, "report.html");
}

/** Extract and structure data for visualization */
function prepareReportData(groups: ReportGroup[]): ReportData {
  return {
    groups: groups.map(group => ({
      baseline: group.baseline
        ? {
            name: group.baseline.name,
            // Convert samples from nanoseconds to milliseconds
            samples: group.baseline.measuredResults.samples.map(
              s => s / 1_000_000,
            ),
            stats: group.baseline.measuredResults.time,
          }
        : undefined,
      benchmarks: group.reports.map(report => ({
        name: report.name,
        // Convert samples from nanoseconds to milliseconds
        samples: report.measuredResults.samples.map(s => s / 1_000_000),
        stats: report.measuredResults.time,
      })),
    })),
    metadata: {
      timestamp: new Date().toISOString(),
      bencherVersion: process.env.npm_package_version || "unknown",
    },
  };
}
