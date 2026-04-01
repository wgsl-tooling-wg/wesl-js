import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export const baselineDir = resolve(__dirname, "../../../_baseline");

/** @return path to baseline wesl package */
function baselinePath(): string {
  return resolve(baselineDir, "packages/wesl/src/index.ts");
}

/** @return true if baseline module exists */
export function hasBaselineModule(): boolean {
  return existsSync(baselinePath());
}
