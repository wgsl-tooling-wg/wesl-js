import yargs from "yargs";

export type CliArgs = ReturnType<typeof cliArgs>;
/** parse command line arguments for wesl-bench */
export function cliArgs(args: string[]) {
  return yargs(args)
    .option("time", {
      type: "number",
      default: 0.642,
      requiresArg: true,
      describe: "benchmark test duration in seconds",
    })
    .option("cpu", {
      type: "boolean",
      default: false,
      describe: "enable CPU counter measurements (requires root)",
    })
    .option("collect", {
      type: "boolean",
      default: false,
      describe: "force a garbage collection after each test",
    })
    .option("observe-gc", {
      type: "boolean",
      default: true,
      describe: "observe garbage collection via perf_hooks",
    })
    .option("profile", {
      type: "boolean",
      default: false,
      describe: "run once, for attaching a profiler",
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
    .option("worker", {
      type: "boolean",
      default: false,
      describe: "run benchmarks in a worker thread for better isolation",
    })
    .help()
    .strict()
    .parseSync();
}
