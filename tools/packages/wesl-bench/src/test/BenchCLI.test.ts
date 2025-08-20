import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchPath = join(__dirname, "../../bin/bench.ts");

test("runs without errors", () => {
  const result = execSync(
    `node --expose-gc --experimental-strip-types ${benchPath} --profile --filter import_only`,
    {
      encoding: "utf8",
    },
  );

  if (!result.includes("lines / sec")) throw new Error("Missing table header");
  if (!result.includes("import_only"))
    throw new Error("Missing benchmark name");
  if (!result.includes("runs")) throw new Error("Missing runs column");
});

test("supports --baseline flag", () => {
  const baselinePath = join(__dirname, "../../../../../_baseline");
  const hasBaseline = existsSync(baselinePath);

  if (!hasBaseline) {
    console.log("Skipping baseline test - no _baseline directory");
    return;
  }

  const result = execSync(
    `node --expose-gc --experimental-strip-types ${benchPath} --profile --filter import_only --baseline`,
    { encoding: "utf8" },
  );

  if (!result.includes("-->")) throw new Error("Missing baseline marker");
  if (!result.includes("Δ%")) throw new Error("Missing diff percentages");
});

test("supports multiple variants", () => {
  const result = execSync(
    `node --expose-gc --experimental-strip-types ${benchPath} --profile --filter import_only --variant tokenize --variant parse`,
    { encoding: "utf8" },
  );

  if (!result.includes("[tokenize]"))
    throw new Error("Missing tokenize variant");
  if (!result.includes("[parse]")) throw new Error("Missing parse variant");
});
