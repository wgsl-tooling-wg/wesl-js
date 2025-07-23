import yargs from "yargs";

/** Default benchmark settings */
const defaultSettings = {
  benchmarkTime: 0.642, // seconds, chosen for statistical significance
  cpuCounters: false,
  observeGc: true,
  forceGc: false,
} as const;

export type CliArgs = ReturnType<typeof cliArgs>;
/** parse command line arguments for wesl-bench */
export function cliArgs(args: string[]) {
  return yargs(args)
    .option("variant", {
      choices: [
        "link",
        "parse",
        "tokenize",
        "wgsl_reflect",
        "use-gpu",
      ] as const,
      default: ["link"] as const,
      describe: "select parser variant(s) to test (can be repeated)",
      array: true,
    })
    .option("baseline", {
      type: "boolean",
      default: true,
      describe: "run baseline comparison using _baseline directory",
    })
    .option("time", {
      type: "number",
      default: defaultSettings.benchmarkTime,
      requiresArg: true,
      describe: "benchmark test duration in seconds",
    })
    .option("cpu", {
      type: "boolean",
      default: defaultSettings.cpuCounters,
      describe: "enable CPU counter measurements (requires root)",
    })
    .option("collect", {
      type: "boolean",
      default: defaultSettings.forceGc,
      describe: "force a garbage collection after each test",
    })
    .option("observe-gc", {
      type: "boolean",
      default: defaultSettings.observeGc,
      describe: "observe garbage collection via perf_hooks",
    })
    .option("profile", {
      type: "boolean",
      default: false,
      describe: "run once, for attaching a profiler",
    })
    .option("manual", {
      type: "boolean",
      default: false,
      describe: "run using manual profiler",
    })
    .option("mitata", {
      type: "boolean",
      default: false,
      describe: "run using vanilla mitata profiler",
    })
    .option("tinybench", {
      type: "boolean",
      default: false,
      describe: "run using tinybench library",
    })
    .option("filter", {
      type: "string",
      requiresArg: true,
      describe:
        "run only benchmarks matching this regex or substring (case-insensitive)",
    })
    .option("simple", {
      type: "string",
      requiresArg: true,
      describe:
        "benchmark a simple function, selected from SimpleTests.ts by prefix",
    })
    .option("worker", {
      type: "boolean",
      default: false,
      describe: "run benchmarks in a worker thread for better isolation",
    })
    .help()
    .strict()
    .parseSync();
}
