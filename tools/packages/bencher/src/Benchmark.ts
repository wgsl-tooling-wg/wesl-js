/** Single benchmark function specification */
export interface BenchmarkSpec<T = unknown> {
  name: string;
  fn: BenchmarkFunction<T>;
  /** Path to module exporting the benchmark function (for worker mode) */
  modulePath?: string;
  /** Name of the exported function in the module (defaults to default export) */
  exportName?: string;
}

export type BenchmarkFunction<T = unknown> =
  | ((params: T) => void)
  | (() => void);

/** Group of benchmarks with shared setup */
export interface BenchGroup<T = unknown> {
  name: string;
  /** Prepare parameters for all benchmarks in this group */
  setup?: () => T | Promise<T>;
  benchmarks: BenchmarkSpec<T>[];
  /** Baseline benchmark for comparison */
  baseline?: BenchmarkSpec<T>;
  /** Metadata for reporting (e.g., lines of code) */
  metadata?: Record<string, any>;
}

/** Collection of benchmark groups */
export interface BenchSuite {
  name: string;
  groups: BenchGroup<any>[];
}
