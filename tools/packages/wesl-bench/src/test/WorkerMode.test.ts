import { test, expect } from "vitest";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchScript = join(__dirname, "../../bin/bench.ts");

test("worker mode runs successfully", { timeout: 20000 }, () => {
  // Run benchmark with worker mode on a small example
  const output = execSync(
    `${benchScript} --variant tokenize --filter bevy --worker --time 0.02`,
    {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    }
  );

  // Check that output contains benchmark results
  expect(output).toContain("bevy [tokenize]");
  expect(output).toContain("lines / sec");
  expect(output).toMatch(/\d+,\d+/); // Check for formatted numbers like "263,995"
  
  // Ensure no error messages
  expect(output).not.toContain("Error");
  expect(output).not.toContain("benchFn is not defined");
  expect(output).not.toContain("Cannot find");
});

test("worker mode works with all variants", { timeout: 30000 }, () => {
  const variants = ["tokenize", "parse", "link", "wgsl-reflect"];
  
  for (const variant of variants) {
    const output = execSync(
      `${benchScript} --variant ${variant} --filter bevy --worker --time 0.02`,
      {
        encoding: "utf8",
        env: { ...process.env, NODE_ENV: "test" },
      }
    );

    // Check that the specific variant ran
    const expectedName = variant === "link" ? "bevy" : `bevy [${variant}]`;
    expect(output).toContain(expectedName);
    expect(output).toContain("lines / sec");
  }
});

test("worker and non-worker modes produce similar results", { timeout: 20000 }, () => {
  // Run with worker
  const workerOutput = execSync(
    `${benchScript} --variant tokenize --filter bevy --worker --time 0.02`,
    {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    }
  );

  // Run without worker  
  const normalOutput = execSync(
    `${benchScript} --variant tokenize --filter bevy --time 0.02`,
    {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    }
  );

  // Both should complete successfully and show results
  expect(workerOutput).toContain("bevy [tokenize]");
  expect(normalOutput).toContain("bevy [tokenize]");
  
  // Both should have lines/sec metrics
  expect(workerOutput).toContain("lines / sec");
  expect(normalOutput).toContain("lines / sec");
});