import type { CpuCounts } from "@mitata/counters";
import type { NodeGCTime } from "./NodeGC.ts";

/** benchmark results: times in milliseconds, sizes in kilobytes */
export interface MeasuredResults {
  /** raw execution time samples, in case you want to to do fancier statistics */
  samples: number[];

  /** Execution time in milliseconds. Measurement overhead is carefully excluded by mitata. */
  time: {
    min: number;
    max: number;
    avg: number;
    p25: number;
    p50: number;
    p75: number;
    p99: number;
    p999: number;
  };

  /** Increate in heap size during the test run, in kilobytes */
  heapSize?: {
    avg: number;
    min: number;
    max: number;
  };

  /**
   * Time to garbage collect in milliseconds.
   *
   * Note that mitata measures the time of an explicit gc() call between
   * after test execution.
   * And so this measurement does not include time spent in garbage collection during the test itself, AFAICT.
   */
  gcTime?: {
    avg: number;
    min: number;
    max: number;
  };

  /** CPU counter measurement stats (min, max, avg) produced by @mitata/counters.
   *
   * only available if run with root, @mitata/counter is available, and option cpuCounters is true
   * (default: false)
   */
  cpu?: CpuCounts;

  /** name fo thye cache  */
  name: string;

  /** L1 cache miss rate  */
  cpuCacheMiss?: number;

  /** CPU stall rate (on macos) */
  cpuStall?: number;

  /** milliseconds spent in garbage collection as measured by node's performance hooks 
   * These collection times measure the 'stop the world' time that blocks the main
   * javascript thread. 

   * Only enabled if option `nodeObserveGC` is true (default: true)
   * 
   * The reported time doesn't reflect the time spent in parallel collection threads,
   * nor account for non stop-the-world slowdowns on the main thread.
   * The main thread is also slowed by collection activity on parallel threads (due
   * to locking, cache impacts, etc.) which is not captured by this metric.
   * 
   */
  nodeGcTime?: NodeGCTime;
}
