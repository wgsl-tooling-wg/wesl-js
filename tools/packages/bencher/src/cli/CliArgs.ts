import type { Argv } from "yargs";
import yargs from "yargs";

export type ConfigureArgs<T> = (yargs: Argv) => Argv<T>;

// biome-ignore format: readability
/** Derive CLI args type from builder function */
export type DefaultCliArgs = 
  ReturnType<typeof defaultCliArgs> extends Argv<infer T> ? 
    T : never;

/** @return yargs with standard benchmark options */
export function defaultCliArgs(yargsInstance: Argv) {
  return yargsInstance
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
      describe: "force a garbage collection after every single iteration",
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
    .option("runner", {
      type: "string",
      default: "mitata",
      choices: ["mitata", "tinybench", "basic"],
      describe: "benchmark runner to use",
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
    .option("adaptive", {
      type: "boolean",
      default: false,
      describe: "use adaptive sampling mode",
    })
    .option("max-time", {
      type: "number",
      default: 30,
      describe: "maximum time in seconds for adaptive mode",
    })
    .option("html", {
      type: "boolean",
      default: false,
      describe: "generate HTML report and open in browser",
    })
    .option("export-html", {
      type: "string",
      requiresArg: true,
      describe: "export HTML report to specified file",
    })
    .option("json", {
      type: "string",
      requiresArg: true,
      describe: "export benchmark data to JSON file",
    })
    .help()
    .strict();
}

/** @return parsed command line arguments */
export function parseCliArgs<T = DefaultCliArgs>(
  args: string[],
  configure: ConfigureArgs<T> = defaultCliArgs as ConfigureArgs<T>,
): T {
  const yargsInstance = configure(yargs(args));
  return yargsInstance.parseSync() as T;
}
