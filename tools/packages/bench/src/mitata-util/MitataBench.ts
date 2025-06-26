import { type PerformanceEntry, PerformanceObserver } from "node:perf_hooks";
import { getHeapStatistics } from "node:v8"; // TODO support other runtimes
import type { CpuCounts } from "@mitata/counters";
import * as mitataCounters from "@mitata/counters"; // TODO load dynamically
import { measure } from "mitata";
import { mapValues } from "./Util.ts";

const maxGcRecords = 1000;

/** gc time mesured by nodes' performance hooks */
export interface NodeGCTime {
  inRun: number;
  before: number;
  after: number;
  total: number;
}

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

  /** CPU counter measurement stats (min, max, avg), including e.g. cache hit rate. */
  cpu?: CpuCounts;
  name: string;

  cpuCacheMiss?: number;

  nodeGcTime?: NodeGCTime; // time spent in garbage collection as measure by node's performance hooks
}

export type MeasureOptions = Parameters<typeof measure>[1] & {
  "&counters"?: typeof mitataCounters; // missing from published types
};

/** Run a function using mitata benchmarking,
 *  collecting time, gc, heap, and cpu counter statistics.
 * @param fn - the function to benchmark
 * @param name - optional name for the benchmark
 * @param options - optional mitata measure options
 * @returns the measured results, with time in milliseconds, and heap size in kilobytes
 */
export async function mitataBench(
  fn: () => any,
  name = "",
  options?: MeasureOptions,
): Promise<MeasuredResults> {
  const heapFn = () => {
    const stats = getHeapStatistics();
    return stats.used_heap_size + stats.malloced_memory;
  };
  const gcRecords = new Array<PerformanceEntry>(maxGcRecords);
  let numRecords = 0;
  const obs = new PerformanceObserver(items => {
    for (const item of items.getEntries()) {
      if (item.name === "gc") {
        gcRecords[numRecords++] = item;
      } else {
        console.log("other", item);
      }
    }
  });
  obs.observe({ entryTypes: ["gc"] });
  let benchStart = 0;
  let benchEnd = 0;

  const newFn = () => {
    if (!benchStart) benchStart = performance.now();
    fn();
    benchEnd = performance.now();
  };

  const stats = await measure(newFn, {
    heap: heapFn,
    $counters: mitataCounters,
    ...options,
  } as MeasureOptions);

  await new Promise(resolve => setTimeout(resolve, 10)); // wait for gc observer to collect
  gcRecords.push(...finishObserver(obs));

  const gcEntries = gcRecords.slice(0, numRecords);
  const nodeGcTime = analyzeGCEntries(gcEntries, [benchStart, benchEnd]);

  const { gc, heap, min, max, avg } = stats;
  const { p25, p50, p75, p99, p999 } = stats;
  const { samples, counters: cpu } = stats;

  const rawTime = { min, max, avg, p25, p50, p75, p99, p999 };
  const time = mapValues(rawTime, x => x / 1e6);
  const gcTime = gc && mapValues(gc, x => x / 1e6);

  const heapSize = heap && mapValues(heap, x => x / 1024);
  const cpuCacheMiss = cacheMissRate(cpu);
  return {
    name,
    time,
    gcTime,
    samples,
    heapSize,
    cpu,
    cpuCacheMiss,
    nodeGcTime,
  };
}

/** finish the observer and return any straggler gc records (unlikely in practice) */
function finishObserver(obs: PerformanceObserver): PerformanceEntry[] {
  const records = obs.takeRecords?.(); // not avail in deno
  obs.disconnect();
  if (!records) return [];

  return records.filter(record => record.entryType === "gc");
}

/** correlate the node perf gc events from hooks with the function timing results */
function analyzeGCEntries(
  gcRecords: PerformanceEntry[],
  benchTime: [number, number],
): NodeGCTime {
  const [start, end] = benchTime;
  let inRun = 0;
  let before = 0;
  let after = 0;
  gcRecords.forEach(record => {
    const { duration, startTime } = record;
    if (startTime < start) before += duration;
    else if (startTime > end) {
      after += duration;
    } else {
      inRun += duration;
    }
  });
  const total = inRun + before + after;
  return { inRun, before, after, total };
}

/** return the CPU L1 cache miss rate */
function cacheMissRate(cpu: any): number | undefined {
  if (cpu?.l1) {
    const { l1 } = cpu;
    const total = cpu.instructions?.loads_and_stores?.avg;
    const loadMiss = l1?.miss_loads?.avg;
    const storeMiss = l1?.miss_stores?.avg; // LATER do store misses cause stalls too?
    if (total === undefined) return undefined;
    if (loadMiss === undefined || storeMiss === undefined) return undefined;

    const miss = loadMiss + storeMiss;
    return miss / total;
  } else if (cpu.cache) { // linux (TODO untested)
    return cpu.cache.misses.avg / cpu.counters.cache.avg;
  }
  return undefined;
}
