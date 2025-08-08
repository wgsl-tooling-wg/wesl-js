import { expect, test } from "vitest";
import { type BenchmarkReport, reportResults } from "../BenchmarkReport.ts";
import { mitataBench } from "../mitata-util/MitataBench.ts";
import { gcSection, runsSection, timeSection } from "../StandardSections.ts";
import { extractValue } from "../table-util/test/TableValueExtractor.ts";

/** Memory-allocating function that creates arrays and objects to trigger GC activity */
function memoryAllocatingFunction(): number {
  // Create arrays to allocate memory
  const arrays = Array(50)
    .fill(0)
    .map(() => Array.from({ length: 200 }, () => Math.random()));

  // Create objects to further allocate memory
  const objects = arrays.map(arr => ({
    data: arr,
    sum: arr.reduce((a, b) => a + b, 0),
    metadata: { length: arr.length, type: "test" },
  }));

  // Perform some computation to make it realistic
  const total = objects.reduce((sum, obj) => sum + obj.sum, 0);

  // Return something to prevent optimization
  return total + objects.length;
}

test("mitataBench produces valid benchmark report", async () => {
  const results = await mitataBench(memoryAllocatingFunction, "test-bench", {
    args: {},
    max_samples: 100,
    observeGC: true, // slows test, LATER could move to an integration test
  });
  const report: BenchmarkReport = {
    name: "test-bench",
    measuredResults: results,
  };

  const table = reportResults(
    [{ reports: [report] }],
    [timeSection, gcSection, runsSection],
  );

  // Extract values using group-aware header-based approach
  const meanTime = extractValue(table, "test-bench", "mean", "time");
  const gcTime = extractValue(table, "test-bench", "mean", "gc");
  const runs = extractValue(table, "test-bench", "runs");

  // Range validations
  expect(meanTime).toBeGreaterThan(0);
  expect(gcTime).toBeGreaterThanOrEqual(0); // GC time can be 0
  expect(runs).toBeGreaterThanOrEqual(1);

  // Verify table contains expected structure
  expect(table).toContain("time");
  expect(table).toContain("runs");
  expect(table).toContain("test-bench");

  // Note: GC time column header is split across lines ("gc t" + "ime")
  expect(table).toContain("gc");
});
