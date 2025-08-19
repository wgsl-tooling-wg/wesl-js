/** Complete benchmark data structure for JSON export */
export interface BenchmarkJsonData {
  meta: {
    timestamp: string;
    version: string;
    args: Record<string, any>;
    environment: {
      node: string;
      platform: string;
      arch?: string;
    };
  };
  suites: BenchmarkSuite[];
}

export interface BenchmarkSuite {
  name: string;
  groups: BenchmarkGroup[];
}

export interface BenchmarkGroup {
  name: string;
  baseline?: BenchmarkResult;
  benchmarks: BenchmarkResult[];
}

export interface BenchmarkResult {
  name: string;
  status: "completed" | "running" | "failed";

  /** Raw execution time samples in milliseconds */
  samples: number[];

  /** Statistical summaries */
  time: {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p75: number;
    p99: number;
    p999: number;
  };

  /** Optional performance metrics */
  heapSize?: {
    min: number;
    max: number;
    mean: number;
  };

  gcTime?: {
    min: number;
    max: number;
    mean: number;
  };

  cpu?: {
    instructions?: number;
    cycles?: number;
    cacheMisses?: number;
    branchMisses?: number;
  };

  /** Execution metadata */
  execution: {
    iterations: number;
    totalTime: number;
    warmupRuns?: number;
  };

  /** Adaptive mode results */
  adaptive?: {
    confidenceInterval: {
      lower: number;
      upper: number;
      margin: number;
      marginPercent: number;
      confidence: number;
    };
    converged: boolean;
    stopReason: "threshold_met" | "max_time" | "max_iterations";
  };

  /** Error information */
  error?: {
    message: string;
    type: string;
    stackTrace?: string;
  };
}
