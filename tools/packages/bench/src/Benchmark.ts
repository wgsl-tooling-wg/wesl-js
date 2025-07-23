/**
 * Core benchmarking interfaces for any type of benchmark
 */

type BenchmarkFunction<T = unknown> = (params: T) => unknown;

export interface BenchmarkSpec<T = unknown> {
  /** Name of this specific benchmark */
  name: string;

  /** The function to benchmark */
  fn: BenchmarkFunction<T>;

  /** Parameters to pass to the benchmark function */
  params: T;

  /** Optional baseline comparison */
  baseline?: {
    /** Baseline function to compare against */
    fn: BenchmarkFunction<T>;
    // No separate params - uses same params as main function
  };
}

export interface BenchTest<T = unknown> {
  /** Name of the test suite */
  name: string;

  /** Optional setup function to prepare parameters */
  setup?: () => T | Promise<T>;

  /** Array of benchmarks to run */
  benchmarks: BenchmarkSpec<T>[];

  /** Optional metadata for reporting (e.g., lines of code) */
  metadata?: Record<string, any>;
}

