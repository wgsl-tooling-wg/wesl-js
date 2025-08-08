import type { Argv } from "yargs";
import yargs from "yargs";

/** Function to configure yargs with CLI arguments */
export type ConfigureArgs<T> = (yargs: Argv) => Argv<T>;

// biome-ignore format: readability
/** Derive CLI args type from builder function */
export type DefaultCliArgs = 
  ReturnType<typeof defaultCliArgs> extends Argv<infer T> ? 
    T : never;

/** Configure default benchmark CLI arguments */
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
    .help()
    .strict();
}

/** Parse CLI with optional custom configuration */
export function parseCliArgs<T = DefaultCliArgs>(
  args: string[],
  configure: ConfigureArgs<T> = defaultCliArgs as ConfigureArgs<T>,
): T {
  const yargsInstance = configure(yargs(args));
  return yargsInstance.parseSync() as T;
}
