import { createRunner } from "./BaseRunner.ts";
import {
  defaultRunnerOptions,
  getGc,
  normalizeResults,
} from "./RunnerUtils.ts";

/** Manual runner with direct performance measurements */
export const manualRunner = createRunner("manual", async (spec, options) => {
  const warmupRuns = options.warmupRuns ?? defaultRunnerOptions.warmupRuns;
  const iterations = options.iterations ?? defaultRunnerOptions.iterations;
  const gc = getGc();

  // Warmup phase
  for (let i = 0; i < warmupRuns; i++) {
    spec.fn(spec.params);
  }

  // Measurement phase
  const samples: number[] = [];

  for (let i = 0; i < iterations; i++) {
    gc(); // Force GC before each measurement if available

    const start = performance.now();
    spec.fn(spec.params);
    const end = performance.now();

    samples.push(end - start);
  }

  return normalizeResults(spec.name, samples);
});
