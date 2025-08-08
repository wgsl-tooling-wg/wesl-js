import type { PerformanceEntry } from "node:perf_hooks";

/** GC time measured by Node's performance hooks */
export interface NodeGCTime {
  inRun: number;
  before: number;
  after: number;
  total: number;
  collects: number;
}

/** Correlate GC events with benchmark timing */
export function analyzeGCEntries(
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
