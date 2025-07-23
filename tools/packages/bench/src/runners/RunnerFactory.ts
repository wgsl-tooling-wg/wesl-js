import { manualRunner } from "./ManualRunner.ts";
import type { Runner } from "./RunnerUtils.ts";
import { standardRunner } from "./StandardRunner.ts";
import { tinyBenchRunner } from "./TinyBenchRunner.ts";
import { vanillaMitataRunner } from "./VanillaMitataRunner.ts";

export type RunnerType = "standard" | "vanilla-mitata" | "tinybench" | "manual";

/**
 * Get a runner by name
 */
export function getRunner<T>(name: RunnerType): Runner<T> {
  switch (name) {
    case "standard":
      return standardRunner as Runner<T>;
    case "vanilla-mitata":
      return vanillaMitataRunner as Runner<T>;
    case "tinybench":
      return tinyBenchRunner as Runner<T>;
    case "manual":
      return manualRunner as Runner<T>;
    default:
      throw new Error(`Unknown runner: ${name}`);
  }
}
