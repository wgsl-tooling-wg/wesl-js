import type { BenchRunner } from "./BenchRunner.ts";

export type KnownRunner = "mitata" | "tinybench" | "basic";

/** Create benchmark runner by name */
export async function createRunner(
  runnerName: KnownRunner,
): Promise<BenchRunner> {
  switch (runnerName) {
    case "mitata": {
      const { MitataBenchRunner } = await import("./MitataBenchRunner.ts");
      return new MitataBenchRunner();
    }
    case "tinybench": {
      const { TinyBenchRunner } = await import("./TinyBenchRunner.ts");
      return new TinyBenchRunner();
    }
    case "basic": {
      const { BasicRunner } = await import("./BasicRunner.ts");
      return new BasicRunner();
    }
    default: {
      const exhaustiveCheck: never = runnerName;
      throw new Error(
        `Unsupported runner: "${exhaustiveCheck}". Available runners: "mitata", "tinybench", "basic"`,
      );
    }
  }
}
