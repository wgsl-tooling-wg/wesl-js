import { type PerformanceEntry, PerformanceObserver } from "node:perf_hooks";
import * as process from "node:process";
import type * as mitataCountersType from "@mitata/counters";
import { measure } from "mitata";
import {
  type MeasuredResults,
  mitataStats,
  type NodeGCTime,
} from "./MitataStats.ts";

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
  gcFunction(); // warn if gc() not available
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
  // Only observe GC if enabled and running under Node.js (only node gives gc perf events)
  const isNode =
    typeof process !== "undefined" &&
    process.versions?.node &&
    !process.versions?.bun;
  if (!enableObserveGC || !isNode) {
    return { nodeGcTime: undefined, stats: await measure(fn, measureOptions) };
  }

  const gcRecords = Array<PerformanceEntry>(maxGcRecords).fill(null as any);
  let numGC = 0;
  const obs = new PerformanceObserver(items => {
    for (const item of items.getEntries()) {
      if (item.name === "gc") {
        gcRecords[numGC++] = item;
      }
    }
  });

  let benchStart: number;
  let benchEnd: number;
  const wrappedFn = () => {
    if (!benchStart) benchStart = performance.now();
    fn();
    benchEnd = performance.now();
  };
  obs.observe({ entryTypes: ["gc"] });

  /** allocate what we can in advance, and run a gc() so that our collection metrics are as pristine as possible */
  wrappedFn();
  await clearGarbage();
  benchStart = 0;
  benchEnd = 0;
  numGC = 0;

  const stats = await measure(wrappedFn, measureOptions);

  await wait(); // let any straggler gc events be delivered
  gcRecords.push(...finishObserver(obs));
  const gcEntries = gcRecords.slice(0, numGC);
  const nodeGcTime = analyzeGCEntries(gcEntries, [benchStart, benchEnd]);
  return { nodeGcTime, stats };
}

/** allocate what we can in advance, and run a gc() so that our collection metrics are as pristine as possible */
async function clearGarbage(): Promise<void> {
  const gc = gcFunction();

  // mysteriously, calling gc() multiple times with a wait in between seems to help on v8
  gc();
  await wait(1000); // mysteriously, 800 is not enough. try pnpm bench --simple someAllocation and look at heap kb
  gc();
  await wait();
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

/** fetch the runtime's function to call gc() manually */
function gcFunction(): () => void {
  const gc = (globalThis as any).gc || (globalThis as any).__gc;
  if (gc) return gc;
  console.warn(
    "MitataBench: gc() not available, run node/bun with --expose-gc",
  );
  return () => {};
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
  let collects = 0;
  gcRecords.forEach(record => {
    const { duration, startTime } = record;
    if (startTime < start) before += duration;
    else if (startTime > end) {
      after += duration;
    } else {
      inRun += duration;
      collects++;
    }
  });
  const total = inRun + before + after;
  return { inRun, before, after, total, collects };
}

function wait(msec = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, msec));
}
