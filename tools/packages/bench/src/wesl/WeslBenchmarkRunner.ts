import type { BenchTest } from "../Benchmark.ts";
import type { BenchmarkReport } from "../BenchmarkReport.ts";
import type { BenchConfig } from "../BenchConfig.ts";
import { createMeasureOptions, extractRunnerOptions } from "../RunBenchmarkUnified.ts";
import { vanillaMitataBatch } from "../runners/VanillaMitataBatch.ts";
import { convertToWeslReports } from "./WeslReportConverter.ts";
import { workerBenchAndReport } from "./WeslWorkerBench.ts";
import type { ParserVariant } from "./BenchVariations.ts";

/** Handle WESL worker mode benchmarks */
export async function handleWeslWorkerBenchmarks(
  tests: BenchTest<any>[],
  config: BenchConfig,
): Promise<BenchmarkReport[]> {
  const reports: BenchmarkReport[] = [];
  const opts = createMeasureOptions(config);
  
  for (const test of tests) {
    // Get the original BenchTest if available (for WESL benchmarks)
    const benchTest = test.metadata?.weslBenchTest;
    if (!benchTest) {
      console.warn(
        `Skipping test ${test.name} - no BenchTest metadata for worker mode`,
      );
      continue;
    }
    
    // Extract variants from benchmark names
    const variants = new Set<string>();
    for (const benchmark of test.benchmarks) {
      const match = benchmark.name.match(/^(\w+):/);
      if (match) {
        variants.add(match[1]);
      }
    }
    
    if (config.runner === "vanilla-mitata") {
      // Use vanilla mitata batch mode
      const batchReports = await vanillaMitataBatch([test], {
        runner: "vanilla-mitata",
        time: config.time,
        useBaseline: config.useBaseline,
      });
      
      // Convert reports to WESL format
      const converted = convertToWeslReports(batchReports);
      reports.push(...converted);
    } else {
      // Use standard worker mode
      const workerReports = await workerBenchAndReport(
        [benchTest],
        opts,
        Array.from(variants) as ParserVariant[],
        config.useBaseline,
        config.runner,
        extractRunnerOptions(config),
      );
      reports.push(...workerReports);
    }
  }
  
  return reports;
}