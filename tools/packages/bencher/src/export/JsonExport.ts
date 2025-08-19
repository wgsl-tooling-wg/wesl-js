import { writeFile } from "node:fs/promises";
import type { ReportGroup } from "../BenchmarkReport.ts";
import type { DefaultCliArgs } from "../cli/CliArgs.ts";
import type {
  BenchmarkGroup,
  BenchmarkJsonData,
  BenchmarkResult,
} from "./JsonFormat.ts";

/** Export benchmark results to JSON file */
export async function exportBenchmarkJson(
  groups: ReportGroup[],
  outputPath: string,
  args: DefaultCliArgs,
  suiteName = "Benchmark Suite",
): Promise<void> {
  const jsonData = prepareJsonData(groups, args, suiteName);
  const jsonString = JSON.stringify(jsonData, null, 2);

  await writeFile(outputPath, jsonString, "utf-8");
  console.log(`Benchmark data exported to: ${outputPath}`);
}

/** Convert ReportGroup data to JSON format */
function prepareJsonData(
  groups: ReportGroup[],
  args: DefaultCliArgs,
  suiteName: string,
): BenchmarkJsonData {
  return {
    meta: {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      args: cleanCliArgs(args),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    },
    suites: [
      {
        name: suiteName,
        groups: groups.map(convertGroup),
      },
    ],
  };
}

/** Convert ReportGroup to BenchmarkGroup */
function convertGroup(group: ReportGroup): BenchmarkGroup {
  return {
    name: "Benchmark Group", // Could be enhanced to include actual group names
    baseline: group.baseline ? convertReport(group.baseline) : undefined,
    benchmarks: group.reports.map(convertReport),
  };
}

/** Convert BenchmarkReport to BenchmarkResult */
function convertReport(report: any): BenchmarkResult {
  const { name, measuredResults } = report;

  return {
    name,
    status: "completed",
    samples: measuredResults.samples || [],
    time: {
      min: measuredResults.time.min,
      max: measuredResults.time.max,
      mean: measuredResults.time.avg,
      p50: measuredResults.time.p50,
      p75: measuredResults.time.p75,
      p99: measuredResults.time.p99,
      p999: measuredResults.time.p999,
    },
    heapSize: measuredResults.heapSize
      ? {
          min: measuredResults.heapSize.min,
          max: measuredResults.heapSize.max,
          mean: measuredResults.heapSize.avg,
        }
      : undefined,
    gcTime: measuredResults.gcTime
      ? {
          min: measuredResults.gcTime.min,
          max: measuredResults.gcTime.max,
          mean: measuredResults.gcTime.avg,
        }
      : undefined,
    cpu: measuredResults.cpu
      ? {
          instructions: measuredResults.cpu.instructions,
          cycles: measuredResults.cpu.cycles,
          cacheMisses: measuredResults.cpuCacheMiss,
          branchMisses: measuredResults.cpu.branchMisses,
        }
      : undefined,
    execution: {
      iterations: measuredResults.samples?.length || 0,
      totalTime: measuredResults.totalTime || 0,
      warmupRuns: undefined, // Not available in current data structure
    },
  };
}

/** Clean CLI args for JSON export (remove undefined values) */
function cleanCliArgs(args: DefaultCliArgs): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && value !== null) {
      // Convert kebab-case to camelCase for consistency
      const cleanKey = key.replace(/-([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      cleaned[cleanKey] = value;
    }
  }

  return cleaned;
}
