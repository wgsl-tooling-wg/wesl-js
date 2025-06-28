import { type PerformanceEntry, PerformanceObserver } from "node:perf_hooks";
import type { CpuCounts } from "@mitata/counters";
import type * as mitataCountersType from "@mitata/counters";
import { measure } from "mitata";
import { mitataStats, type MeasuredResults, type NodeGCTime } from "./MitataStats.ts";

export type MeasureResult = Awaited<ReturnType<typeof measure>>;
const maxGcRecords = 1000;

/** Load mitataCounters dynamically if cpuCounters is enabled, otherwise return undefined */
async function loadMitataCounters(
  options?: MeasureOptions,
): Promise<typeof mitataCountersType | undefined> {
  if (!options?.cpuCounters) {
    return undefined;
  }

  try {
    return await import("@mitata/counters");
  } catch (error) {
    console.warn("Failed to load @mitata/counters:", error);
    return undefined;
  }
}

export type MeasureOptions = Parameters<typeof measure>[1] & {
  $counters?: typeof mitataCountersType; // missing from published types, loaded dynamically
  cpuCounters?: boolean; // default: false
  observeGC?: boolean; // default: true
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
  verifyGcExposed();
  const heapFn = await getHeapFn();

  const measureOptions = {
    heap: heapFn,
    $counters: await loadMitataCounters(options),
    ...options,
  } as MeasureOptions;

  const observeGC = options?.observeGC ?? true;
  const result = await measureWithObserveGC(fn, measureOptions, observeGC);
  const { nodeGcTime, stats } = result;
  return mitataStats(stats, name, nodeGcTime);
}

/** measure a function with mitata, collecting GC stats if enabled */
async function measureWithObserveGC(
  fn: () => any,
  measureOptions: MeasureOptions,
  enableObserveGC: boolean,
): Promise<{
  nodeGcTime: NodeGCTime | undefined;
  stats: Awaited<ReturnType<typeof measure>>;
}> {
  if (!enableObserveGC) {
    fn();
    return { nodeGcTime: undefined, stats: await measure(fn, measureOptions) };
  }

  const gcRecords = Array<PerformanceEntry>(maxGcRecords).fill(null as any);
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
  const wrappedFn = () => {
    if (!benchStart) benchStart = performance.now();
    fn();
    benchEnd = performance.now();
  };
  
  const stats = await measure(wrappedFn, measureOptions);

  await new Promise(resolve => setTimeout(resolve, 10)); // wait for gc observer to collect
  gcRecords.push(...finishObserver(obs));
  const gcEntries = gcRecords.slice(0, numRecords);
  const nodeGcTime = analyzeGCEntries(gcEntries, [benchStart, benchEnd]);
  return { nodeGcTime, stats };
}

/** finish the observer and return any straggler gc records (unlikely in practice) */
function finishObserver(obs: PerformanceObserver): PerformanceEntry[] {
  const records = obs.takeRecords?.(); // not avail in deno
  obs.disconnect();
  if (!records) return [];

  return records.filter(record => record.entryType === "gc");
}
async function getHeapFn(): Promise<() => number> {
  if ((globalThis as any).Bun?.version) {
    // @ts-expect-error: bun:jsc is only available in Bun runtime
    const { memoryUsage } = await import("bun:jsc");
    return () => {
      const m = memoryUsage();
      return m.current;
    };
  }

  try {
    const { getHeapStatistics } = await import("node:v8");
    getHeapStatistics();
    return () => {
      const m = getHeapStatistics();
      return m.used_heap_size + m.malloced_memory;
    };
  } catch {}

  console.warn("no heap statistics available");
  return () => 0;
}

function verifyGcExposed(): void {
  if (globalThis.gc) return;
  if ((globalThis as any).__gc) return;
  console.warn(
    "MitataBench: gc() not available, run node/bun with --expose-gc",
  );
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
