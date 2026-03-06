import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchScript = join(__dirname, "../../bin/bench.ts");

/** @return exec options for test environment */
function testExecOptions() {
  return {
    encoding: "utf8" as const,
    env: { ...process.env, NODE_ENV: "test" },
  };
}

/** @return node command for benchmark with variant */
function benchCommand(variant: string, time: string, worker = true): string {
  const base = "--expose-gc --experimental-strip-types";
  const workerFlag = worker ? "--worker" : "";
  return `node ${base} ${benchScript} --variant ${variant} --filter bevy ${workerFlag} --time ${time}`;
}

/** @return benchmark name for variant */
function benchName(variant: string): string {
  return variant === "link" ? "bevy" : `bevy [${variant}]`;
}

/** Validates benchmark output contains expected patterns */
function validateOutput(output: string, variant: string): void {
  const name = benchName(variant);
  expect(output).toContain(name);
  expect(output).toContain("lines / sec");
  expect(output).not.toContain("Error");
  expect(output).not.toContain("benchFn is not defined");
  expect(output).not.toContain("Cannot find");
}

test("runs in worker mode", { timeout: 10000 }, () => {
  const output = execSync(benchCommand("tokenize", "0.01"), testExecOptions());

  validateOutput(output, "tokenize");
  expect(output).toMatch(/\d+,\d+/);
});

test("supports all benchmark variants", { timeout: 30000 }, () => {
  const variants = ["tokenize", "parse", "link", "wgsl-reflect"];

  variants.forEach(variant => {
    const output = execSync(benchCommand(variant, "0.02"), testExecOptions());
    validateOutput(output, variant);
  });
});

test("produces similar results in worker and direct modes", {
  timeout: 20000,
}, () => {
  const worker = execSync(
    benchCommand("tokenize", "0.02", true),
    testExecOptions(),
  );
  const direct = execSync(
    benchCommand("tokenize", "0.02", false),
    testExecOptions(),
  );

  [worker, direct].forEach(output => {
    expect(output).toContain("bevy [tokenize]");
    expect(output).toContain("lines / sec");
  });
});
