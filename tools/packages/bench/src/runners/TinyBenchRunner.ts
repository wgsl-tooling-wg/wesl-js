import { createRunner } from "./BaseRunner.ts";
import {
  defaultRunnerOptions,
  normalizeResults,
  timeConversions,
} from "./RunnerUtils.ts";

interface Bench {
  tasks: Array<{
    name: string;
    result?: {
      samples: number[];
    };
  }>;
  add(name: string, fn: () => void): void;
  run(): Promise<any>;
}

interface BenchOptions {
  time: number;
  warmupTime: number;
  warmupIterations: number;
}

/** Create a tinybench instance with given options */
async function createBench(options: BenchOptions): Promise<Bench> {
  const { Bench } = await import("tinybench");
  return new Bench(options);
}

export const tinyBenchRunner = createRunner(
  "tinybench",
  async (spec, options) => {
    const bench = await createBench({
      time:
        (options.time ?? defaultRunnerOptions.time) * timeConversions.secToMs,
      warmupTime: options.warmupTime ?? defaultRunnerOptions.warmupTime,
      warmupIterations: options.warmupRuns ?? defaultRunnerOptions.warmupRuns,
    });

    bench.add(spec.name, () => spec.fn(spec.params));

    await bench.run();

    const task = bench.tasks.find((t: any) => t.name === spec.name);
    if (!task || !task.result) {
      throw new Error(`No results found for benchmark: ${spec.name}`);
    }

    const samples = task.result.samples.map(
      (s: number) => s * timeConversions.nsToMs,
    );
    return normalizeResults(spec.name, samples, {});
  },
);
