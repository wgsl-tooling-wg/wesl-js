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
  gc?: number; // GC time as fraction of total bench time
}

export const gcSection: ResultsMapper<GcStats> = {
  extract: (results: MeasuredResults) => {
    let gcTime: number | undefined;
    const { nodeGcTime, time, samples } = results;
    if (nodeGcTime && time?.avg) {
      const totalBenchTime = time.avg * samples.length;
      if (totalBenchTime > 0) {
        gcTime = nodeGcTime.inRun / totalBenchTime;
        if (gcTime > 1) {
          // GC time can't exceed total time
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

export interface AdaptiveTimeStats {
  mean?: number;
  p50?: number;
  totalTime?: number; // total sampling duration in seconds
}

export const adaptiveTimeSection: ResultsMapper<AdaptiveTimeStats> = {
  extract: (results: MeasuredResults) => ({
    mean: results.time?.avg,
    p50: results.time?.p50,
    totalTime: results.totalTime,
  }),
  columns: (): ReportColumnGroup<AdaptiveTimeStats>[] => [
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
      ],
    },
  ],
};

export const totalTimeSection: ResultsMapper<{ totalTime?: number }> = {
  extract: (results: MeasuredResults) => ({
    totalTime: results.totalTime,
  }),
  columns: (): ReportColumnGroup<{ totalTime?: number }>[] => [
    {
      columns: [
        {
          key: "totalTime",
          title: "time",
          formatter: v => {
            if (typeof v !== "number") return "";
            const timeout = 30;
            if (v >= timeout) {
              return `[${v.toFixed(1)}s]`;
            }
            return `${v.toFixed(1)}s`;
          },
        },
      ],
    },
  ],
};
