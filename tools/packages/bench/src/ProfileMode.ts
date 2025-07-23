import type { BenchTest } from "./Benchmark.ts";

/** Run profile mode - execute first benchmark once without data collection
 * Useful for attaching the profiler or for continuous integration */
export async function runProfileMode(tests: BenchTest<any>[]): Promise<void> {
  if (tests.length === 0) {
    console.error("No benchmarks to profile");
    return;
  }

  const firstTest = tests[0];
  if (firstTest.benchmarks.length === 0) {
    console.error("No benchmark specs in first test");
    return;
  }

  // Setup test data if needed
  const params = firstTest.setup ? await firstTest.setup() : {};

  // Run the first benchmark function once
  const firstBenchmark = firstTest.benchmarks[0];
  const benchParams = firstBenchmark.params ?? params;

  console.log(`Profiling: ${firstBenchmark.name}`);
  firstBenchmark.fn(benchParams);
}
