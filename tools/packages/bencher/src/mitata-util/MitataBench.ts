import { type PerformanceEntry, PerformanceObserver } from "node:perf_hooks";
/// <reference path="../../types/mitata-counters.d.ts" />
import type * as mitataCountersType from "@mitata/counters";
import { measure } from "mitata";
import type { MeasuredResults } from "../MeasuredResults.ts";
import { analyzeGCEntries, type NodeGCTime } from "../NodeGC.ts";
import { mitataStats } from "./MitataStats.ts";

type GCObservationResult = {
  nodeGcTime: NodeGCTime | undefined;
  stats: Awaited<ReturnType<typeof measure>>;
};

type GCObserver = {
  gcRecords: PerformanceEntry[];
  numGC: number;
  observer: PerformanceObserver;
};

export type MeasureResult = Awaited<ReturnType<typeof measure>>;

/** Load mitataCounters dynamically if cpuCounters is enabled, otherwise return undefined */
async function loadMitataCounters(
  options?: MeasureOptions,
): Promise<typeof mitataCountersType | undefined> {
  if (!options?.cpuCounters) {
    return undefined;
  }

  try {
    const counters = await import("@mitata/counters");

    // Check if running with sufficient privileges
    if (
      process.platform !== "win32" &&
      process.getuid &&
      process.getuid() !== 0
    ) {
      console.warn(
        "⚠️  CPU counters require root access. Run with sudo for CPU measurements.",
      );
      console.warn("   Continuing without CPU counters...\n");
      return undefined;
    }

    return counters;
  } catch (error) {
    console.warn("Failed to load @mitata/counters:", error);
    console.warn("CPU measurements will be unavailable.\n");
    return undefined;
  }
}

/** options for mitata */
export type MeasureOptions = Parameters<typeof measure>[1] & {
  $counters?: typeof mitataCountersType; // missing from published types, loaded dynamically
  cpuCounters?: boolean; // default: false
  observeGC?: boolean; // default: true
  warmupTime?: number; // missing from published types, supported by mitata
  collect?: boolean; // force GC after each iteration
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
    // Use Mitata's built-in inner_gc option to force GC before each iteration
    inner_gc: options?.collect,
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
): Promise<GCObservationResult> {
  if (!shouldObserveGC(enableObserveGC)) {
    return { nodeGcTime: undefined, stats: await measure(fn, measureOptions) };
  }

  const gcObserver = createGCObserver();
  let benchStart: number;
  let benchEnd: number;
  const wrappedFn = createBenchmarkWrapper(fn, () => {
    if (!benchStart) benchStart = performance.now();
    benchEnd = performance.now();
  });

  gcObserver.observer.observe({ entryTypes: ["gc"] });

  await runWarmupAndClear(wrappedFn, gcObserver);
  benchStart = 0;
  benchEnd = 0;

  const stats = await measure(wrappedFn, measureOptions);
  const nodeGcTime = await finishGCObservation(gcObserver, [
    benchStart,
    benchEnd,
  ]);

  return { nodeGcTime, stats };
}

function shouldObserveGC(enableObserveGC: boolean): boolean {
  const isNode =
    typeof process !== "undefined" &&
    process.versions?.node &&
    !process.versions?.bun;
  return enableObserveGC && !!isNode;
}

function createGCObserver(): GCObserver {
  const gcRecords: PerformanceEntry[] = [];
  let numGC = 0;
  const observer = new PerformanceObserver(items => {
    for (const item of items.getEntries()) {
      if (item.name === "gc") {
        gcRecords[numGC++] = item;
      }
    }
  });
  return { gcRecords, numGC, observer };
}

function createBenchmarkWrapper(fn: () => any, onTiming: () => void) {
  return () => {
    onTiming();
    fn();
  };
}

async function runWarmupAndClear(
  wrappedFn: () => void,
  gcObserver: GCObserver,
): Promise<void> {
  wrappedFn();
  await clearGarbage();
  gcObserver.numGC = 0;
}

async function finishGCObservation(
  gcObserver: GCObserver,
  benchTiming: [number, number],
): Promise<NodeGCTime | undefined> {
  await wait();
  gcObserver.gcRecords.push(...finishObserver(gcObserver.observer));
  const gcEntries = gcObserver.gcRecords.slice(0, gcObserver.numGC);
  return analyzeGCEntries(gcEntries, benchTiming);
}

/** allocate what we can in advance, and run a gc() so that our collection metrics are as pristine as possible */
async function clearGarbage(): Promise<void> {
  const gc = gcFunction();
  gc();
  await wait(1000); // milliseconds, wait after GC. mysteriously, 800 is not enough. try pnpm bench --simple someAllocation and look at heap kb
  gc();
  await wait();
}

/** finish the observer and return any straggler gc records (unlikely in practice) */
function finishObserver(obs: PerformanceObserver): PerformanceEntry[] {
  const records = obs.takeRecords?.();
  obs.disconnect();
  if (!records) return [];
  return records.filter(record => record.entryType === "gc");
}
async function getHeapFn(): Promise<() => number> {
  if ((globalThis as any).Bun?.version) {
    // @ts-expect-error: bun:jsc is only available in Bun runtime
    const { memoryUsage } = await import("bun:jsc");
    return () => memoryUsage().current;
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
  const gc = globalThis.gc || (globalThis as any).__gc;
  if (gc) return gc;
  console.warn(
    "MitataBench: gc() not available, run node/bun with --expose-gc --allow-natives-syntax",
  );
  return () => {};
}

async function wait(msec = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, msec));
}
