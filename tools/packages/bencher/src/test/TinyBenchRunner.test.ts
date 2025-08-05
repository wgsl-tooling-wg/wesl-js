import { expect, test } from "vitest";
import type { BenchmarkSpec } from "../Benchmark.ts";
import { TinyBenchRunner } from "../runners/TinyBenchRunner.ts";

/** simple computation function for benchmarking */
function fibonacci(n = 10): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

test("TinyBenchRunner runs benchmark in direct mode", async () => {
  const runner = new TinyBenchRunner();
  const spec: BenchmarkSpec<number> = {
    name: "fibonacci-test",
    fn: fibonacci,
    params: 15,
  };

  const results = await runner.runBench(spec, { minTime: 100, maxTime: 50 });

  expect(results).toHaveLength(1);
  const result = results[0];

  expect(result.name).toBe("fibonacci-test");
  expect(result.samples.length).toBeGreaterThan(0);

  expect(result.time.max).toBeGreaterThan(0);
  expect(result.time.avg).toBeGreaterThan(0);
  expect(result.time.p50).toBeGreaterThan(0);
  expect(result.time.p99).toBeGreaterThan(0);
});
