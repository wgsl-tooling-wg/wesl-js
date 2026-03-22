import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchScript = join(__dirname, "../../bin/bench.ts");

test("adaptive mode reports statistical metrics", { timeout: 10000 }, () => {
  const output = execSync(
    `${benchScript} --variant tokenize --filter import_only --adaptive --time 0.01 --max-time 0.5`,
    {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    },
  );

  // Should show adaptive mode metrics
  expect(output).toContain("lines / sec");
  expect(output).toContain("±CV"); // Coefficient of variation
  expect(output).toContain("converged"); // Convergence confidence

  // Should have the benchmark name
  expect(output).toContain("import_only");
});

test("adaptive mode converges on stable benchmarks", { timeout: 10000 }, () => {
  const output = execSync(
    `${benchScript} --variant parse --filter particle --adaptive --time 0.01 --max-time 0.5`,
    {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    },
  );

  // Should show convergence information
  expect(output).toMatch(/\d+%/); // Confidence percentage

  // Should show CV
  expect(output).toMatch(/±\d+\.\d+%/); // CV percentage
});

test("adaptive mode works with baseline comparison", { timeout: 10000 }, () => {
  const output = execSync(
    `${benchScript} --variant tokenize --filter import_only --adaptive --time 0.01 --max-time 0.5 --baseline`,
    {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    },
  );

  // Should show baseline comparison
  expect(output).toContain("-->"); // Baseline marker
  expect(output).toContain("Δ%"); // Percentage change
});
