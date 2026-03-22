import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LoadedCase } from "benchforge";
import { loadAllExamples, type WeslSource } from "./LoadExamples.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const examplesDir = join(__dirname, "..", "wesl-examples");
const fixturesDir = join(__dirname, "..", "fixtures");

/** Default cases (fast subset for quick benchmarks) */
export const defaultCases = ["bevy_env_map"];

/** Default variants (fast subset for quick benchmarks) */
export const defaultVariants = ["link"];

/** All available benchmark cases */
export const cases = Object.keys(loadAllExamples(examplesDir, fixturesDir));

/** Load a benchmark case by ID */
export function loadCase(id: string): LoadedCase<WeslSource> {
  const examples = loadAllExamples(examplesDir, fixturesDir);
  const source = examples[id];
  if (!source) throw new Error(`Unknown case: ${id}`);
  return { data: source, metadata: { loc: source.lineCount ?? 0 } };
}
