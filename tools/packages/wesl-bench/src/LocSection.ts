import {
  integer,
  type MeasuredResults,
  type ReportColumnGroup,
  type ResultsMapper,
} from "bencher";

/** Lines of code statistics */
export interface LocStats {
  lines?: number;
  locSecP50?: number;
  locSecMax?: number;
}

export const locSection: ResultsMapper<LocStats> = {
  extract: (results: MeasuredResults, metadata?: any) => {
    const lines = metadata?.linesOfCode || 0;

    // Calculate lines per second
    const locSecP50 = results.time?.p50
      ? lines / (results.time.p50 / 1000)
      : undefined;
    const locSecMax = results.time?.min
      ? lines / (results.time.min / 1000)
      : undefined; // min time = max throughput

    return { lines, locSecP50, locSecMax };
  },
  columns: (): ReportColumnGroup<LocStats>[] => [
    {
      groupTitle: "lines / sec",
      columns: [
        {
          key: "locSecP50",
          title: "p50",
          formatter: integer,
          comparable: true,
        },
        {
          key: "locSecMax",
          title: "max",
          formatter: integer,
          comparable: true,
        },
        {
          key: "lines",
          title: "lines",
          formatter: integer,
        },
      ],
    },
  ],
};
