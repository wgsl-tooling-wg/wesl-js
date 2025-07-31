export interface BenchmarkSpec<T = unknown> {
  /** Name of this specific benchmark */
  name: string;

  /** The function to benchmark */
  fn: BenchmarkFunction<T>;

  /** Parameters to pass to the benchmark function */
  params: T;
}

export type BenchmarkFunction<T = unknown> = (params: T) => unknown;


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

export interface BenchGroup<T = unknown> {
  /** name of a group of tests */
  name: string;

  /** Optional setup function to prepare parameters */
  setup?: () => T | Promise<T>;

  /** Array of benchmarks to run */
  benchmarks: BenchmarkSpec<T>[];

  /** Optional metadata for reporting (e.g., lines of code) */
  metadata?: Record<string, any>;
}

export interface BenchSuite {
  /** Name of the suite */
  name: string;

  /** Array of test groups */
  groups: BenchGroup[];
}