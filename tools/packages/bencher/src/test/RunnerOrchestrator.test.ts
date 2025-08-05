import { expect, test } from "vitest";
import type { BenchmarkSpec } from "../Benchmark.ts";
import { runBenchmark } from "../runners/RunnerOrchestrator.ts";

/** lightweight function for testing worker communication */
function simpleTestFunction(): number {
  let sum = 0;
  for (let i = 0; i < 1000; i++) {
    sum += Math.sqrt(i);
  }
  return sum;
}

test("MitataBenchRunner runs benchmark in worker mode", async () => {
  const spec: BenchmarkSpec = {
    name: "worker-test",
    fn: simpleTestFunction,
  };

  const results = await runBenchmark(
    spec,
    "mitata",
    {
      minTime: 1,
      maxIterations: 10,
      minSamples: 1,
      warmupTime: 0,
      warmupSamples: 0,
      observeGC: false, // Disable GC observation to avoid 1000ms wait
    },
    true,
  );

  expect(results).toHaveLength(1);
  const result = results[0];

  expect(result.name).toBe("worker-test");
  expect(result.samples.length).toBeGreaterThan(0);
  expect(result.time.p50).toBeGreaterThan(0);
});

test("TinyBenchRunner runs benchmark in worker mode", async () => {
  const spec: BenchmarkSpec<number> = {
    name: "worker-fibonacci-test",
    fn: (n: number) => {
      if (n <= 1) return n;
      const fib = (x: number): number => (x <= 1 ? x : fib(x - 1) + fib(x - 2));
      return fib(n);
    },
  };

  const results = await runBenchmark(
    spec,
    "tinybench",
    {
      maxTime: 5, // Reduced from 30ms
      warmupTime: 0, // Disable warmup
    },
    true,
    5,
  );

  expect(results).toHaveLength(1);
  const result = results[0];

  expect(result.name).toBe("worker-fibonacci-test");
  expect(result.samples.length).toBeGreaterThan(0);
  expect(result.time).toBeDefined();
});

test("BasicRunner runs benchmark in worker mode", async () => {
  const spec: BenchmarkSpec = {
    name: "basic-worker-test",
    fn: simpleTestFunction,
  };

  const results = await runBenchmark(
    spec,
    "basic",
    {
      maxTime: 5, // Reduced from 100ms
      maxIterations: 50, // Reduced from 500
    },
    true,
  );

  expect(results).toHaveLength(1);
  const result = results[0];

  expect(result.name).toBe("basic-worker-test");
  expect(result.samples.length).toBeGreaterThan(0);
  expect(result.samples.length).toBeLessThanOrEqual(500);
  expect(result.time.min).toBeGreaterThan(0);
  expect(result.time.max).toBeGreaterThanOrEqual(result.time.min);
  expect(result.time.avg).toBeGreaterThan(0);
  expect(result.time.p50).toBeGreaterThan(0);
  expect(result.time.p99).toBeGreaterThan(0);
});

test("RunnerOrchestrator propagates mitata errors from worker", async () => {
  const spec: BenchmarkSpec = {
    name: "error-test",
    fn: () => {
      throw new Error("Test error from benchmark");
    },
  };

  await expect(
    runBenchmark(
      spec,
      "mitata",
      {
        minTime: 1,
        maxIterations: 1,
        observeGC: false,
      },
      true,
    ),
  ).rejects.toThrow("Test error from benchmark");
});
