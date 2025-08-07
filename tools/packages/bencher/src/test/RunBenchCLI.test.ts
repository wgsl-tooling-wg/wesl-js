import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "vitest";
import type { BenchSuite } from "../Benchmark.ts";
import { filterBenchmarks } from "../cli/FilterBenchmarks.ts";
import { runBenchCLITest } from "./TestUtils.ts";

const testSuite: BenchSuite = {
  name: "Test Suite",
  groups: [
    {
      name: "String Operations",
      benchmarks: [
        { name: "concatenation", fn: () => "a" + "b" },
        { name: "template literal", fn: () => `a${"b"}` },
      ],
    },
    {
      name: "Math Operations",
      benchmarks: [
        { name: "addition", fn: () => 1 + 1 },
        { name: "multiplication", fn: () => 2 * 2 },
      ],
    },
  ],
};

const suiteWithSetup: BenchSuite = {
  name: "Array Suite",
  groups: [
    {
      name: "Array Operations",
      setup: () => ({
        numbers: Array.from({ length: 100 }, (_, i) => i),
        strings: Array.from({ length: 100 }, (_, i) => `item${i}`),
      }),
      benchmarks: [
        {
          name: "sum numbers",
          fn: ({ numbers }: any) =>
            numbers.reduce((a: number, b: number) => a + b, 0),
        },
        {
          name: "join strings",
          fn: ({ strings }: any) => strings.join(","),
        },
      ],
    },
  ],
};

test("runs all benchmarks", async () => {
  const output = await runBenchCLITest(testSuite, "--time 0.1 --runner basic");

  expect(output).toContain("concatenation");
  expect(output).toContain("template literal");
  expect(output).toContain("addition");
  expect(output).toContain("multiplication");
  expect(output).toContain("mean");
  expect(output).toContain("runs");
});

test("filters by substring", async () => {
  const output = await runBenchCLITest(
    testSuite,
    "--filter concat --time 0.1 --runner basic",
  );

  expect(output).toContain("concatenation");
  expect(output).not.toContain("addition");
});

test("filters by regex", async () => {
  const output = await runBenchCLITest(
    testSuite,
    "--filter ^template --time 0.1 --runner basic",
  );

  expect(output).toContain("template literal");
  expect(output).not.toContain("addition");
});

test("filter preserves suite structure", () => {
  const filtered = filterBenchmarks(testSuite, "concatenation");

  expect(filtered.name).toBe("Test Suite");
  expect(filtered.groups).toHaveLength(2);
  expect(filtered.groups[0].name).toBe("String Operations");
  expect(filtered.groups[0].benchmarks).toHaveLength(1);
  expect(filtered.groups[0].benchmarks[0].name).toBe("concatenation");
  expect(filtered.groups[1].benchmarks).toHaveLength(0);
});

/** Execute test fixture script and return output */
function executeTestScript(args = ""): string {
  const scriptPath = path.join(
    import.meta.dirname!,
    "fixtures/test-bench-script.ts",
  );
  return execSync(
    `node --expose-gc --allow-natives-syntax ${scriptPath} ${args}`,
    {
      encoding: "utf8",
    },
  );
}

test("e2e: runs user script", () => {
  const output = executeTestScript("--time 0.1 --runner basic");

  expect(output).toContain("plus");
  expect(output).toContain("multiply");
  expect(output).toContain("mean");
  expect(output).toContain("runs");

  const lines = output.split("\n");
  const headerLine = lines.find(l => l.includes("name"));
  expect(headerLine).toBeTruthy();

  const plusLine = lines.find(l => l.includes("plus"));
  expect(plusLine).toMatch(/\d+[ns|μs|ms]/); // Basic runner uses time units
});

test("e2e: filter flag", () => {
  const output = executeTestScript('--filter "plus" --time 0.1 --runner basic');

  expect(output).toContain("plus");
  expect(output).not.toContain("multiply");
});

test("runs benchmarks with setup function", async () => {
  const output = await runBenchCLITest(
    suiteWithSetup,
    "--time 0.1 --runner basic",
  );

  expect(output).toContain("sum numbers");
  expect(output).toContain("join strings");
  expect(output).toContain("mean");
  expect(output).toContain("runs");
});

test(
  "runs benchmarks with baseline comparison",
  { timeout: 10000 },
  async () => {
    const suiteWithBaseline: BenchSuite = {
      name: "Baseline Test",
      groups: [
        {
          name: "Sort Comparison",
          setup: () => ({
            data: Array.from({ length: 10 }, () => Math.random()), // Reduced array size
          }),
          baseline: {
            name: "baseline sort",
            fn: ({ data }: any) => [...data].sort(),
          },
          benchmarks: [
            {
              name: "optimized sort",
              fn: ({ data }: any) => [...data].sort((a, b) => a - b),
            },
          ],
        },
      ],
    };

    const output = await runBenchCLITest(
      suiteWithBaseline,
      "--time 0.01 --runner basic",
    ); // Further reduced time

    expect(output).toContain("baseline sort");
    expect(output).toContain("optimized sort");
    expect(output).toContain("Δ%"); // Diff column should appear
    expect(output).toContain("mean");
  },
);
