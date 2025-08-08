import { execSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchScript = join(__dirname, "../../bin/bench.ts");

test("worker mode runs successfully", { timeout: 10000 }, () => {
  const output = execSync(
    `${benchScript} --variant tokenize --filter bevy --worker --time 0.01`,
    {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    },
  );

  expect(output).toContain("bevy [tokenize]");
  expect(output).toContain("lines / sec");
  expect(output).toMatch(/\d+,\d+/); // formatted numbers like "263,995"

  expect(output).not.toContain("Error");
  expect(output).not.toContain("benchFn is not defined");
  expect(output).not.toContain("Cannot find");
});
