import { expect, test } from "vitest";
import type { BenchmarkSpec } from "../Benchmark.ts";
import { MitataBenchRunner } from "../runners/MitataBenchRunner.ts";

/** memory-allocating function that creates arrays and objects to trigger GC activity */
function memoryAllocatingFunction(): number {
  const arrays = Array(500)
    .fill(0)
    .map(() => Array.from({ length: 200 }, () => Math.random()));

  const objects = arrays.map(arr => ({
    data: arr,
    sum: arr.reduce((a, b) => a + b, 0),
    metadata: { length: arr.length, type: "test" },
  }));

  const total = objects.reduce((sum, obj) => sum + obj.sum, 0);
  return total + objects.length;
}

test("MitataBenchRunner runs benchmark in direct mode", async () => {
  const runner = new MitataBenchRunner();
  const spec: BenchmarkSpec = {
    name: "memory-allocation-test",
    fn: memoryAllocatingFunction,
  };

  const results = await runner.runBench(spec, {
    minTime: 1, // Minimal time for unit tests
    maxIterations: 10, // Very few samples for faster tests
    minSamples: 3, // Very low minimum sample count
    warmupSamples: 0, // No warmup for unit tests
    warmupThreshold: 0, // Always skip warmup
  });

  expect(results).toHaveLength(1);
  const result = results[0];

  expect(result.name).toBe("memory-allocation-test");
  expect(result.samples.length).toBeGreaterThan(0);

  expect(result.time).toBeDefined();
  expect(result.time.min).toBeGreaterThan(0);
  expect(result.time.max).toBeGreaterThan(0);
  expect(result.time.p50).toBeGreaterThan(0);

  expect(result.heapSize).toBeDefined();
});
