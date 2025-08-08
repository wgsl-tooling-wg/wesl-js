import type { CpuCounts } from "@mitata/counters";
import type { NodeGCTime } from "./NodeGC.ts";

/** Benchmark results: times in milliseconds, sizes in kilobytes */
export interface MeasuredResults {
  name: string;

  /** Raw execution time samples for custom statistics */
  samples: number[];

  /** Execution time in milliseconds (measurement overhead excluded by mitata) */
  time: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p75: number;
    p99: number;
    p999: number;
  };

  /** Heap size increase during test run (kilobytes) */
  heapSize?: {
    avg: number;
    min: number;
    max: number;
  };

  /**
   * Time for explicit gc() call after test execution (milliseconds).
   * Does not include GC time during test execution.
   * Only reported by mitata runner.
   */
  gcTime?: {
    avg: number;
    min: number;
    max: number;
  };

  /** CPU counter stats from @mitata/counters (requires root access) */
  cpu?: CpuCounts;

  /** L1 cache miss rate */
  cpuCacheMiss?: number;

  /** CPU stall rate (macOS only) */
  cpuStall?: number;

  /**
   * Stop-the-world GC time blocking main thread (milliseconds).
   * Measured via Node's performance hooks when nodeObserveGC is true.
   * Excludes parallel thread collection time and indirect slowdowns.
   */
  nodeGcTime?: NodeGCTime;
}
