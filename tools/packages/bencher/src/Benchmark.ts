/** a single function to benchmark */
export interface BenchmarkSpec<T = unknown> {
  /** Name of this specific benchmark */
  name: string;

  /** The function to benchmark */
  fn: BenchmarkFunction<T>;

  /** Optional: Path to module exporting the benchmark function (for worker mode) */
  modulePath?: string;

  /** Optional: Name of the exported function in the module (defaults to default export) */
  exportName?: string;
}

export type BenchmarkFunction<T = unknown> =
  | ((params: T) => void)
  | (() => void);

/** a group of benchmark functions with a common setup */
export interface BenchGroup<T = unknown> {
  /** name of the group */
  name: string;

  /** Optional setup function to prepare parameters */
  setup?: () => T | Promise<T>;

  /** Array of benchmark functions to run */
  benchmarks: BenchmarkSpec<T>[];

  /** Optional baseline benchmark for comparison */
  baseline?: BenchmarkSpec<T>;

  /** Optional metadata for reporting (e.g., lines of code) */
  metadata?: Record<string, any>;
}

/** a collection of groups of tests */
export interface BenchSuite {
  /** Name of the suite */
  name: string;

  /** Array of test groups */
  groups: BenchGroup<any>[];
}
