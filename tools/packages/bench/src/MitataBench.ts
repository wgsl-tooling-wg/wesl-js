import type { CpuCounts } from "@mitata/counters";
import * as mitataCounters from "@mitata/counters";
import { measure } from "mitata";
import { type PerformanceEntry, PerformanceObserver } from "node:perf_hooks";
import { getHeapStatistics } from "node:v8"; // TODO support other runtimes

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

  /** Execution time in milliseconds. Measurement overhead is not carefully excluded by mitata. */
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

  const nodeGcTime = analyzeGCEntries(gcRecords.slice(0, numRecords), [
    benchStart,
    benchEnd,
  ]);

  const { gc, heap, min, max, avg } = stats;
  const { p25, p50, p75, p99, p999 } = stats;
  const { samples, counters: cpu } = stats;

  const rawTime = { min, max, avg, p25, p50, p75, p99, p999 };
  const time = mapValues(rawTime, x => x / 1e6);
  const gcTime = gc && mapValues(gc, x => x / 1e6);

  const heapSize = heap && mapValues(heap, x => x / 1024);
  return { name, time, gcTime, samples, heapSize, cpu, nodeGcTime };
}

/** finish the observer and return any straggler gc records (unlikely in practice) */
function finishObserver(obs: PerformanceObserver): PerformanceEntry[] {
  const records = obs.takeRecords?.(); // not avail in deno
  obs.disconnect();
  if (!records) return [];

  return records.filter(record => record.entryType === "gc");
}

/** return an array partitioned into possibly overlapping groups */
export function grouped<T>(a: T[], size: number, stride = size): T[][] {
  const groups = [];
  for (let i = 0; i < a.length; i += stride) {
    groups.push(a.slice(i, i + size));
  }
  return groups;
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

/** apply a map() on the values in a Record.
 * @return a new Record.  */
export function mapValues<K extends string | number | symbol, T, U>(
  obj: Record<K, T>,
  fn: (v: T) => U,
): Record<K, U> {
  const result = {} as Record<K, U>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = fn(obj[key]);
    }
  }
  return result;
}
