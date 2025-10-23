import { execSync } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runVitest(projectDir: string, testFile: string): string {
  const configPath = path.join(projectDir, "vitest.fixture.config.ts");
  const testPath = path.join(projectDir, testFile);
  return execSync(`pnpm exec vitest run --config ${configPath} ${testPath}`, {
    encoding: "utf8",
    stdio: "pipe",
  });
}

test("e2e: reporter failing snapshots", async () => {
  const fixtureDir = path.join(__dirname, "fixtures/failing-snapshot");
  const reportDir = path.join(fixtureDir, "__image_diff_report__");

  // Clean report directory before running
  await fs.rm(reportDir, { recursive: true, force: true });

  // Run fixture (expect test to fail)
  try {
    runVitest(fixtureDir, "red-vs-blue.test.ts");
    throw new Error("Expected test to fail");
  } catch (err: any) {
    // Test should fail - that's expected
    expect(err.status).toBe(1);
  }

  // Validate HTML report was generated
  const reportHtml = await fs.readFile(
    path.join(reportDir, "index.html"),
    "utf-8",
  );
  expect(reportHtml).toContain("red vs blue snapshot");
}, 15000);
