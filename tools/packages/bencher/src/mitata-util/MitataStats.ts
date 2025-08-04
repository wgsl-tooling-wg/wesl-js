import type { CpuCounts } from "@mitata/counters";
import type { MeasuredResults } from "../MeasuredResults.ts";
import type { NodeGCTime } from "../NodeGC.ts";
import type { MeasureResult } from "./MitataBench.ts";
import { mapValues } from "./Util.ts";

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
