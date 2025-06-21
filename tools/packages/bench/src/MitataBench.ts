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
import * as counters from "@mitata/counters";

export async function mitataBench(
  fn: () => Promise<void>|void,
  name = "",
): Promise<void> {

  const heap = () => {
    const stats = getHeapStatistics();
    return stats.used_heap_size + stats.malloced_memory;
  };

  const stats = await measure(fn, {
    min_cpu_time: 500 * 1e6, // 500ms
    inner_gc: true,
    heap: heap,
    $counters: counters, // 
  } as any);

  const {
    gc,
    heap: heapStats,
    min,
    max,
    avg,
    p75,
    p99,
    samples,
    counters: cc,
  } = stats;
  console.log(`\n--- ${name} ---`);
  console.log({
    avg_ms: avg / 1e6,
    min_ms: min / 1e6,
    max_ms: max / 1e6,
    samples: samples.length,
    heap: heapStats
      ? {
          avg_kb: heapStats.avg / 1024,
          min_kb: heapStats.min / 1024,
          max_kb: heapStats.max / 1024,
        }
      : "disabled",
    gc: gc
      ? {
          avg_ms: gc.avg / 1e6,
          min_ms: gc.min / 1e6,
          max_ms: gc.max / 1e6,
        }
      : "disabled (run with --expose-gc)",
    counters: cc,
  });
}