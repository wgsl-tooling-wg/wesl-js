import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { cli } from "../WgslTestRunner.ts";

const fixturesDir = fileURLToPath(
  new URL("./fixtures/wesl_test_pkg", import.meta.url),
);

test("wgsl-test run discovers and runs *.test.wesl files", async () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args.join(" "));

  const originalExit = process.exit;
  let exitCode: number | undefined;
  process.exit = ((code: number) => {
    exitCode = code;
  }) as typeof process.exit;

  try {
    await cli(["run", "--projectDir", fixturesDir]);
  } finally {
    console.log = originalLog;
    process.exit = originalExit;
  }

  const output = logs.join("\n");
  expect(output).toContain("sample.test.wesl");
  expect(output).toContain("failingTest"); // Failing test names are shown
  expect(output).toContain("FAIL");
  expect(output).toContain("1 passed"); // passingTest passed
  expect(exitCode).toBe(1); // Should fail because failingTest fails
});
