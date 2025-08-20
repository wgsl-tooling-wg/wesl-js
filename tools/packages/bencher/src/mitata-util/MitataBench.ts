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

/** @return mitataCounters if cpuCounters enabled, else undefined */
async function loadMitataCounters(
  options?: MeasureOptions,
): Promise<typeof mitataCountersType | undefined> {
  if (!options?.cpuCounters) {
    return undefined;
  }

  try {
    const counters = await import("@mitata/counters");

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

/** Options for mitata benchmarking */
export type MeasureOptions = Parameters<typeof measure>[1] & {
  $counters?: typeof mitataCountersType; // missing from published types, loaded dynamically
  cpuCounters?: boolean; // default: false
  observeGC?: boolean; // default: true
  warmupTime?: number; // missing from published types, supported by mitata
  collect?: boolean; // force GC after each iteration
};

/** @return measured results with time (ms) and heap (kb) */
export async function mitataBench(
  fn: () => any,
  name = "",
  options?: MeasureOptions,
): Promise<MeasuredResults> {
  gcFunction();
  const heapFn = await getHeapFn();

  const measureOptions = {
    heap: heapFn,
    $counters: await loadMitataCounters(options),
    ...options,
    inner_gc: options?.collect,
  } as MeasureOptions;

  const observeGC = options?.observeGC ?? true;
  const result = await measureWithObserveGC(fn, measureOptions, observeGC);
  const { nodeGcTime, stats } = result;
  return mitataStats(stats, name, nodeGcTime);
}

/** @return mitata measurements with optional GC stats */
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
      if (item.entryType === "gc") {
        gcRecords.push(item);
        numGC++;
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
  gcObserver.gcRecords.length = 0;
  gcObserver.numGC = 0;
}

async function finishGCObservation(
  gcObserver: GCObserver,
  benchTiming: [number, number],
): Promise<NodeGCTime | undefined> {
  await wait();
  gcObserver.gcRecords.push(...finishObserver(gcObserver.observer));
  return analyzeGCEntries(gcObserver.gcRecords, benchTiming);
}

/** Clear garbage for pristine collection metrics */
async function clearGarbage(): Promise<void> {
  const gc = gcFunction();
  gc();
  await wait(1000); // 800ms insufficient - see heap kb in someAllocation test
  gc();
  await wait();
}

/** @return remaining gc records from observer */
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

/** @return runtime's gc() function */
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
