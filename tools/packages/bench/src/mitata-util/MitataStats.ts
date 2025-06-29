import type { CpuCounts } from "@mitata/counters";
import type { MeasureResult } from "./MitataBench.ts";
import { mapValues } from "./Util.ts";

/** Mitata benchmark results: times in milliseconds, sizes in kilobytes */
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

/** gc time mesured by nodes' performance hooks */
export interface NodeGCTime {
  inRun: number;
  before: number;
  after: number;
  total: number;
  collects: number;
}

/** convert stats to standard form, milliseconds and kilobytes */
export function mitataStats(
  stats: MeasureResult,
  name: string,
  nodeGcTime: NodeGCTime | undefined,
): MeasuredResults {
  const { gc, heap, min, max, avg } = stats;
  const { p25, p50, p75, p99, p999 } = stats;
  const { samples, counters: cpu } = stats;

  const time = mapValues(
    { min, max, avg, p25, p50, p75, p99, p999 },
    x => x / 1e6,
  );
  const gcTime = gc && mapValues(gc, x => x / 1e6);
  const heapSize = heap && mapValues(heap, x => x / 1024);
  const cpuCacheMiss = cacheMissRate(cpu as CpuCounts | undefined);
  const cpuStall = cpuStallRate(cpu as CpuCounts | undefined);
  return {
    name,
    time,
    gcTime,
    samples,
    heapSize,
    cpu,
    cpuCacheMiss,
    cpuStall,
    nodeGcTime,
  };
}

/** return the CPU L1 cache miss rate */
function cacheMissRate(cpu?: CpuCounts): number | undefined {
  if (cpu?.l1) {
    const { l1 } = cpu;
    const total = cpu.instructions?.loads_and_stores?.avg;
    const loadMiss = l1?.miss_loads?.avg;
    const storeMiss = l1?.miss_stores?.avg; // LATER do store misses cause stalls too?
    if (total === undefined) return undefined;
    if (loadMiss === undefined || storeMiss === undefined) return undefined;

    const miss = loadMiss + storeMiss;
    return miss / total;
  } else if (cpu?.cache?.misses) {
    // linux (TODO untested)
    return cpu.cache.misses.avg / cpu.cache.avg;
  }
  return undefined;
}

function cpuStallRate(cpu?: CpuCounts): number | undefined {
  const stalls = cpu?.cycles?.stalls?.avg;
  const cycles = cpu?.cycles?.avg;
  if (stalls === undefined || !cycles) return undefined;

  return stalls / cycles;
}
