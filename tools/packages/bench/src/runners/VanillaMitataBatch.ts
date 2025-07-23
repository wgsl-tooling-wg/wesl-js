import * as mitata from "mitata";
import type { BenchTest } from "../Benchmark.ts";
import { shouldRunBaseline } from "../BenchmarkHelpers.ts";
import { mitataStats } from "../mitata-util/MitataStats.ts";
import type { BenchmarkReport, RunBenchmarkOptions } from "../RunBenchmark.ts";

/**
 * Run vanilla mitata benchmarks in batch mode to show mitata's native output
 * followed by collecting results for standard table display
 */
export async function vanillaMitataBatch<T>(
  tests: BenchTest<T>[],
  options: RunBenchmarkOptions,
): Promise<BenchmarkReport<T>[]> {
  const reports: BenchmarkReport<T>[] = [];

  console.log("\n--- Vanilla Mitata Native Output ---");

  // Register all benchmarks
  for (const test of tests) {
    const params = test.setup ? await test.setup() : ({} as T);

    for (const benchmark of test.benchmarks) {
      const benchParams = getParams(benchmark, params);

      // Register main benchmark
      mitata.bench(benchmark.name, () => benchmark.fn(benchParams!));

      // Register baseline if requested
      if (shouldRunBaseline(options, benchmark)) {
        mitata.bench(`${benchmark.name} (baseline)`, () =>
          benchmark.baseline!.fn(benchParams!),
        );
      }
    }
  }

  // Run all benchmarks and show native output
  // mitata.run() just displays results, doesn't return them
  // We need to run each benchmark individually to collect results

  const collectedResults: any[] = [];

  for (const test of tests) {
    const params = test.setup ? await test.setup() : ({} as T);

    for (const benchmark of test.benchmarks) {
      const benchParams = getParams(benchmark, params);

      // Run and measure each benchmark individually
      const result = await mitata.measure(() => benchmark.fn(benchParams!));
      collectedResults.push({
        name: benchmark.name,
        ...result,
      });

      // Run baseline if requested
      if (shouldRunBaseline(options, benchmark)) {
        const baselineResult = await mitata.measure(() =>
          benchmark.baseline!.fn(benchParams!),
        );
        collectedResults.push({
          name: `${benchmark.name} (baseline)`,
          ...baselineResult,
        });
      }
    }
  }

  // Show native output
  await mitata.run();

  console.log("\n--- End Vanilla Mitata Output ---\n");

  console.log("--- Standard Table Format ---");

  // Convert results to our format
  for (const test of tests) {
    const testResults: BenchmarkReport<T>["results"] = [];

    for (const benchmark of test.benchmarks) {
      const mainResult = collectedResults.find(r => r.name === benchmark.name);
      const baselineResult = shouldRunBaseline(options, benchmark)
        ? collectedResults.find(r => r.name === `${benchmark.name} (baseline)`)
        : undefined;

      if (mainResult) {
        testResults.push({
          spec: benchmark,
          mainResult: mitataStats(mainResult, benchmark.name, undefined),
          baselineResult: baselineResult
            ? mitataStats(
                baselineResult,
                `${benchmark.name} (baseline)`,
                undefined,
              )
            : undefined,
        });
      }
    }

    if (testResults.length > 0) {
      reports.push({
        test,
        results: testResults,
      });
    }
  }

  return reports;
}

/** Get parameters with fallback to default params */
function getParams<T>(
  benchmark: { params?: T },
  defaultParams?: T,
): T | undefined {
  return benchmark.params ?? defaultParams;
}
