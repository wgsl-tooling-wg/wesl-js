import { measure } from "mitata";
import { getHeapStatistics } from "node:v8"; // TODO support other runtimes
import type { CpuCounts } from "@mitata/counters";
import * as mitataCounters from "@mitata/counters";
import { type PerformanceEntry, PerformanceObserver } from "node:perf_hooks";
import { Node } from "wgsl_reflect";

const defaultMaxSamples = 1e9; // from mitata's default

/** gc time mesured by nodes' performance hooks */
export interface NodeGCTime {
  inRun: number;
  betweenRuns: number;
  beforeAfterRuns: number;
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
  const maxSamples = options?.max_samples ?? defaultMaxSamples;
  const gcRecords = new Array<PerformanceEntry>(maxSamples);
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
  const times: number[] = new Array(maxSamples);

  let i = 0;
  const newFn = () => {
    times[i++] = performance.now();
    fn();
    times[i++] = performance.now();
    // globalThis.gc?.(); // trigger gc if available
  };

  const stats = await measure(newFn, {
    heap: heapFn,
    $counters: mitataCounters,
    ...options,
  } as MeasureOptions);
  await new Promise(resolve => setTimeout(resolve, 10));
  const records = obs.takeRecords();
  records.forEach(record => {
    if (record.entryType === "gc") {
      console.log("straggler gc record", record);
      gcRecords[numRecords++] = record;
    } else {
      console.log("other record", record);
    }
  });
  obs.disconnect();

  const nodeGcTime = analyzeGCEntries(
    gcRecords.slice(0, numRecords),
    times.slice(0, i),
  );

  const { gc, heap, min, max, avg } = stats;
  const { p25, p50, p75, p99, p999 } = stats;
  const { samples, counters: cpu } = stats;

  const rawTime = { min, max, avg, p25, p50, p75, p99, p999 };
  const time = mapValues(rawTime, x => x / 1e6);
  const gcTime = gc && mapValues(gc, x => x / 1e6);

  const heapSize = heap && mapValues(heap, x => x / 1024);
  return { name, time, gcTime, samples, heapSize, cpu, nodeGcTime };
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
  times: number[],
): NodeGCTime {
  let inRun = 0;
  let betweenRuns = 0;
  let beforeAfterRuns = 0;
  const runs = grouped(times, 2);
  let runDex = 0;
  let currentRun = runs[runDex];
  gcRecords.forEach(record => {
    const { duration, startTime } = record;
    // advance currentRun until we find a run that contains the record or comes after the record
    while (runDex < runs.length && startTime > currentRun[1]) {
      runDex++;
      currentRun = runs[runDex];
    }

    if (runDex >= runs.length) {
      beforeAfterRuns += duration;
    } else if (startTime < currentRun[0]) {
      if (runDex === 0) {
        beforeAfterRuns += duration;
      } else {
        betweenRuns += duration;
      }
    } else {
      inRun += duration;
    }
  });
  const total = inRun + betweenRuns + beforeAfterRuns;
  return { inRun, betweenRuns, beforeAfterRuns, total };
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
