import type { ReportColumnGroup, ResultsMapper } from "./BenchmarkReport.ts";
import type { MeasuredResults } from "./MeasuredResults.ts";
import {
  integer,
  percent,
  percentPrecision,
  timeMs,
} from "./table-util/Formatters.ts";

export interface TimeStats {
  mean?: number;
  p50?: number;
  p99?: number;
}

/** Extract and format time statistics */
export const timeSection: ResultsMapper<TimeStats> = {
  extract: (results: MeasuredResults) => ({
    mean: results.time?.avg,
    p50: results.time?.p50,
    p99: results.time?.p99,
  }),
  columns: (): ReportColumnGroup<TimeStats>[] => [
    {
      groupTitle: "time",
      columns: [
        {
          key: "mean",
          title: "mean",
          formatter: timeMs,
          comparable: true,
        },
        {
          key: "p50",
          title: "p50",
          formatter: timeMs,
          comparable: true,
        },
        {
          key: "p99",
          title: "p99",
          formatter: timeMs,
          comparable: true,
        },
      ],
    },
  ],
};

export interface GcStats {
  /** mean time of garbage collection across all runs */
  gc?: number;
}

/** Extract and format GC percentage */
export const gcSection: ResultsMapper<GcStats> = {
  extract: (results: MeasuredResults) => {
    let gcTime: number | undefined;
    const { nodeGcTime, time, samples } = results;
    if (nodeGcTime && time?.avg) {
      const totalBenchTime = time.avg * samples.length;
      if (totalBenchTime > 0) {
        gcTime = nodeGcTime.inRun / totalBenchTime;
        // Ignore meaningless measurements where GC exceeds benchmark time
        if (gcTime > 1) {
          gcTime = undefined;
        }
      }
    }
    return { gc: gcTime };
  },
  columns: (): ReportColumnGroup<GcStats>[] => [
    {
      groupTitle: "gc",
      columns: [
        {
          key: "gc",
          title: "mean",
          formatter: percent,
          comparable: true,
        },
      ],
    },
  ],
};

export interface CpuStats {
  cpuCacheMiss?: number;
  cpuStall?: number;
}

/** Extract and format CPU counters */
export const cpuSection: ResultsMapper<CpuStats> = {
  extract: (results: MeasuredResults) => ({
    cpuCacheMiss: results.cpuCacheMiss,
    cpuStall: results.cpuStall,
  }),
  columns: (): ReportColumnGroup<CpuStats>[] => [
    {
      groupTitle: "cpu",
      columns: [
        {
          key: "cpuCacheMiss",
          title: "L1 miss",
          formatter: percent,
        },
        {
          key: "cpuStall",
          title: "stalls",
          formatter: percentPrecision(2),
        },
      ],
    },
  ],
};

export interface RunStats {
  runs?: number;
}

/** Extract number of benchmark runs */
export const runsSection: ResultsMapper<RunStats> = {
  extract: (results: MeasuredResults) => ({
    runs: results.samples.length,
  }),
  columns: (): ReportColumnGroup<RunStats>[] => [
    {
      columns: [
        {
          key: "runs",
          title: "runs",
          formatter: integer,
        },
      ],
    },
  ],
};
