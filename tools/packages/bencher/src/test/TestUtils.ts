import type { BenchSuite } from "../Benchmark.ts";
import type { ConfigureArgs, DefaultCliArgs } from "../cli/CliArgs.ts";
import { parseCliArgs } from "../cli/CliArgs.ts";
import { defaultReport, runBenchmarks } from "../cli/RunBenchCLI.ts";

/** Test utility - runs benchmarks and returns formatted output */
export async function runBenchCLITest<T = DefaultCliArgs>(
  suite: BenchSuite,
  args: string,
  configureArgs?: ConfigureArgs<T>,
): Promise<string> {
  const argv = args.split(/\s+/).filter(arg => arg.length > 0);
  const parsedArgs = parseCliArgs(argv, configureArgs) as T & DefaultCliArgs;
  const results = await runBenchmarks(suite, parsedArgs);
  return defaultReport(results, parsedArgs);
}
