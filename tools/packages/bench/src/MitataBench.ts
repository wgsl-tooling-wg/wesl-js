import {
  summary,
  barplot,
  boxplot,
  measure,
  bench,
  run,
  lineplot,
} from "mitata";
import { getHeapStatistics } from "node:v8";
import type { CpuCounts } from "@mitata/counters";
import * as mitataCounters from "@mitata/counters";

/** all times in milliseconds */
export interface BenchResults {
  samples: number;
  /** time in milliseconds */
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
  heapSize?: {
    avg: number;
    min: number;
    max: number;
  };
  gcTime?: {
    avg: number;
    min: number;
    max: number;
  };
  cpu?: CpuCounts;
  name: string;
}

type MeasureOptions = Parameters<typeof measure>[1] & {
  "&counters"?: typeof mitataCounters; // missing from published types
};

export async function mitataBench(
  fn: () => Promise<void> | void,
  name = "",
  options?: MeasureOptions,
): Promise<BenchResults> {
  const heapFn = () => {
    const stats = getHeapStatistics();
    return stats.used_heap_size + stats.malloced_memory;
  };

  const stats = await measure(fn, {
    min_cpu_time: 500 * 1e6, // 500ms
    inner_gc: true,
    heap: heapFn,
    $counters: mitataCounters,
    ...options,
  } as MeasureOptions);

  const { gc, heap, min, max, avg } = stats;
  const { p25, p50, p75, p99, p999 } = stats;
  const { samples, counters: cpu } = stats;

  const rawTime = { min, max, avg, p25, p50, p75, p99, p999 };
  const time = mapValues(rawTime, x => x / 1e6);
  const gcTime = gc && mapValues(gc, x => x / 1e6);

  const heapSize = heap && mapValues(heap, x => x / 1024);
  return { name, time, gcTime, samples: samples.length, heapSize, cpu };
}

/** Run a function over the values in a Record
 * @return a new Record with mapped values.  */
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
