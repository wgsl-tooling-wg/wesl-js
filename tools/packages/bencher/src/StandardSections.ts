import type { ReportColumnGroup, ResultsMapper } from "./BenchmarkReport.ts";
import type { MeasuredResults } from "./MeasuredResults.ts";
import {
  floatPrecision,
  integer,
  percent,
  percentPrecision,
} from "./table-util/Formatters.ts";

export interface TimeStats {
  mean?: number;
  p50?: number;
  p99?: number;
}

/** Time statistics section */
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
          formatter: floatPrecision(2),
          comparable: true,
        },
        {
          key: "p50",
          title: "p50",
          formatter: floatPrecision(2),
          comparable: true,
        },
        {
          key: "p99",
          title: "p99",
          formatter: floatPrecision(2),
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

/** Garbage collection section */
export const gcSection: ResultsMapper<GcStats> = {
  extract: (results: MeasuredResults) => {
    let gcTime: number | undefined;
    if (results.nodeGcTime) {
      gcTime = results.nodeGcTime.inRun / results.samples.length;
    }
    return { gc: gcTime };
  },
  columns: (): ReportColumnGroup<GcStats>[] => [
    {
      groupTitle: "gc time",
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

/** CPU statistics section */
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

/** number of benchmark test runs */
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
