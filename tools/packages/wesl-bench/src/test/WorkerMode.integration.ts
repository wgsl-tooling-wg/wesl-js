import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchScript = join(__dirname, "../../bin/bench.ts");

test("works with all variants", { timeout: 30000 }, () => {
  const variants = ["tokenize", "parse", "link", "wgsl-reflect"];

  for (const variant of variants) {
    const output = execSync(
      `node --expose-gc --experimental-strip-types ${benchScript} --variant ${variant} --filter bevy --worker --time 0.02`,
      {
        encoding: "utf8",
        env: { ...process.env, NODE_ENV: "test" },
      },
    );

    const expectedName = variant === "link" ? "bevy" : `bevy [${variant}]`;
    expect(output).toContain(expectedName);
    expect(output).toContain("lines / sec");
  }
});

test(
  "worker and non-worker modes produce similar results",
  { timeout: 20000 },
  () => {
    const workerOutput = execSync(
      `node --expose-gc --experimental-strip-types ${benchScript} --variant tokenize --filter bevy --worker --time 0.02`,
      {
        encoding: "utf8",
        env: { ...process.env, NODE_ENV: "test" },
      },
    );

    const normalOutput = execSync(
      `node --expose-gc --experimental-strip-types ${benchScript} --variant tokenize --filter bevy --time 0.02`,
      {
        encoding: "utf8",
        env: { ...process.env, NODE_ENV: "test" },
      },
    );

    expect(workerOutput).toContain("bevy [tokenize]");
    expect(normalOutput).toContain("bevy [tokenize]");

    expect(workerOutput).toContain("lines / sec");
    expect(normalOutput).toContain("lines / sec");
  },
);
