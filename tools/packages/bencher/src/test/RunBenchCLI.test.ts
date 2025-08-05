import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import type { BenchSuite } from "../Benchmark.ts";
import { cliArgs } from "../cli/CliArgs.ts";
import {
  cliToRunnerOptions,
  filterBenchmarks,
  runBenchCLI,
} from "../cli/RunBenchCLI.ts";

const testSuite: BenchSuite = {
  name: "Test Suite",
  groups: [
    {
      name: "String Operations",
      benchmarks: [
        { name: "concatenation", fn: () => "a" + "b", params: undefined },
        { name: "template literal", fn: () => `a${"b"}`, params: undefined },
      ],
    },
    {
      name: "Math Operations",
      benchmarks: [
        { name: "addition", fn: () => 1 + 1, params: undefined },
        { name: "multiplication", fn: () => 2 * 2, params: undefined },
      ],
    },
  ],
};

/** Capture console output from async function */
async function captureConsoleOutput(fn: () => Promise<void>): Promise<string> {
  let output = "";
  const original = console.log;
  console.log = (msg: string) => {
    output += msg + "\n";
  };

  try {
    await fn();
    return output;
  } finally {
    console.log = original;
  }
}

test("runs all benchmarks", async () => {
  const output = await captureConsoleOutput(() =>
    runBenchCLI(testSuite, ["--time", "0.1"]),
  );

  expect(output).toContain("concatenation");
  expect(output).toContain("template literal");
  expect(output).toContain("addition");
  expect(output).toContain("multiplication");
  expect(output).toContain("mean");
  expect(output).toContain("runs");
});

test("filters by substring", async () => {
  const output = await captureConsoleOutput(() =>
    runBenchCLI(testSuite, ["--filter", "concat", "--time", "0.1"]),
  );

  expect(output).toContain("concatenation");
  expect(output).not.toContain("template literal");
  expect(output).not.toContain("addition");
  expect(output).not.toContain("multiplication");
});

test("filters by regex", async () => {
  const output = await captureConsoleOutput(() =>
    runBenchCLI(testSuite, ["--filter", "^template", "--time", "0.1"]),
  );

  expect(output).toContain("template literal");
  expect(output).not.toContain("concatenation");
  expect(output).not.toContain("addition");
});

test("filter returns empty groups for no matches", () => {
  const filtered = filterBenchmarks(testSuite, "nonexistent");

  expect(filtered.name).toBe("Test Suite");
  expect(filtered.groups).toHaveLength(2);
  expect(filtered.groups[0].benchmarks).toHaveLength(0);
  expect(filtered.groups[1].benchmarks).toHaveLength(0);
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

test("converts time to milliseconds", () => {
  const args = cliArgs(["--time", "0.5"]);
  const options = cliToRunnerOptions(args);

  expect(options.minTime).toBe(500);
});

test("uses default options", () => {
  const args = cliArgs([]);
  const options = cliToRunnerOptions(args);

  expect(options.minTime).toBe(642);
  expect(options.observeGC).toBe(true);
});

test("profile mode sets single iteration", () => {
  const args = cliArgs(["--profile"]);
  const options = cliToRunnerOptions(args);

  expect(options.maxIterations).toBe(1);
  expect(options.minSamples).toBe(1);
  expect(options.warmupSamples).toBe(0);
});

/** Create test benchmark script */
function createTestBenchScript(): string {
  const importPath = path.resolve(import.meta.dirname!, "../index.ts");
  return `
import { runBenchCLI, type BenchSuite } from '${importPath}';

const suite: BenchSuite = {
  name: "Test",
  groups: [{
    name: "Math",
    benchmarks: [
      { name: "plus", fn: () => 1 + 1, params: undefined },
      { name: "multiply", fn: () => 2 * 2, params: undefined }
    ]
  }]
};

runBenchCLI(suite);
`;
}

/** Run script in temp dir and return output */
function executeTestScript(script: string, args = ""): string {
  const tempDir = mkdtempSync(path.join(tmpdir(), "bench-cli-test-"));
  const scriptPath = path.join(tempDir, "test-bench.ts");

  try {
    writeFileSync(scriptPath, script);
    return execSync(`node --expose-gc --import tsx ${scriptPath} ${args}`, {
      encoding: "utf8",
    });
  } finally {
    rmSync(tempDir, { recursive: true });
  }
}

test("e2e: runs user script", () => {
  const script = createTestBenchScript();
  const output = executeTestScript(script, "--time 0.1");

  expect(output).toContain("plus");
  expect(output).toContain("multiply");
  expect(output).toContain("mean");
  expect(output).toContain("runs");

  const lines = output.split("\n");
  const headerLine = lines.find(l => l.includes("name"));
  expect(headerLine).toBeTruthy();

  const plusLine = lines.find(l => l.includes("plus"));
  expect(plusLine).toMatch(/\d+\.\d+/);
});

test("e2e: filter flag", () => {
  const script = createTestBenchScript();
  const output = executeTestScript(script, '--filter "plus" --time 0.1');

  expect(output).toContain("plus");
  expect(output).not.toContain("multiply");
});
