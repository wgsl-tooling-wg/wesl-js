import type { BenchTest } from "./Benchmark.ts";
import type { BenchConfig } from "./BenchConfig.ts";

/** Interface for loading benchmark tests */
export interface TestLoader {
  /** Load benchmark tests based on configuration */
  loadTests(config: BenchConfig): Promise<BenchTest<any>[]>;
}