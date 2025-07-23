import type { BenchmarkSpec } from "../Benchmark.ts";
import type { MeasuredResults } from "../mitata-util/MitataStats.ts";
import type { Runner, RunnerOptions } from "./RunnerUtils.ts";
import { logBenchmarkProgress } from "./RunnerUtils.ts";

export type MeasureFunction<T> = (
  spec: BenchmarkSpec<T>,
  options: RunnerOptions,
) => Promise<MeasuredResults>;

export function createRunner<T>(
  name: string,
  measureFn: MeasureFunction<T>,
): Runner<T> {
  return {
    name,
    runSingleBenchmark: async (spec, options) => {
      logBenchmarkProgress(spec.name, name, options);
      return measureFn(spec, options);
    },
  };
}
