import type { RunnerType } from "./runners/RunnerFactory.ts";

/** Unified configuration for all benchmark operations */
export interface BenchConfig {
  // Test selection
  filter?: string;

  // Execution mode
  mode: "standard" | "worker" | "profile";
  runner: RunnerType;

  // Benchmark options
  time: number;
  warmupTime?: number;
  warmupRuns?: number;
  iterations?: number;

  // Features
  useBaseline: boolean;
  showCpu: boolean;
  observeGc: boolean;
  collectGc: boolean;

  // Extension point for specific implementations
  extension?: unknown;
}

/** Default benchmark runner options */
export const defaultRunnerOptions = {
  tinybench: {
    warmupTime: 100,
    warmupRuns: 10,
  },
  manual: {
    warmupRuns: 10,
    iterations: 12,
  },
  standard: {},
  "vanilla-mitata": {},
} as const;

/** Create base configuration from common CLI arguments */
export function createBaseConfig(argv: any): Omit<BenchConfig, "extension"> {
  // Determine execution mode
  let mode: BenchConfig["mode"] = "standard";
  if (argv.profile) {
    mode = "profile";
  } else if (argv.worker) {
    mode = "worker";
  }

  // Select runner
  let runner: RunnerType = "standard";
  if (argv.mitata) {
    runner = "vanilla-mitata";
  } else if (argv.tinybench) {
    runner = "tinybench";
  } else if (argv.manual) {
    runner = "manual";
  }

  // Get runner-specific options
  const runnerOpts = defaultRunnerOptions[runner];

  return {
    // Test selection
    filter: argv.filter,

    // Execution mode
    mode,
    runner,

    // Benchmark options
    time: argv.time,
    warmupTime: "warmupTime" in runnerOpts ? runnerOpts.warmupTime : undefined,
    warmupRuns: "warmupRuns" in runnerOpts ? runnerOpts.warmupRuns : undefined,
    iterations: "iterations" in runnerOpts ? runnerOpts.iterations : undefined,

    // Features
    useBaseline: argv.baseline && mode !== "profile",
    showCpu: argv.cpu,
    observeGc: argv.observeGc,
    collectGc: argv.collect,
  };
}
