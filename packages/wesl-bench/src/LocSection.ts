import {
  integer,
  type MeasuredResults,
  type ReportColumnGroup,
  type ResultsMapper,
} from "benchforge";

/** Lines of code throughput statistics */
export interface LocStats {
  lines?: number;
  locSecP50?: number;
  locSecMax?: number;
}

export const locSection: ResultsMapper<LocStats> = {
  extract: (results: MeasuredResults, metadata?: any) => {
    const lines = metadata?.linesOfCode ?? metadata?.loc ?? 0;
    const { p50, min } = results.time ?? {};
    const locSecP50 = p50 ? lines / (p50 / 1000) : undefined;
    const locSecMax = min ? lines / (min / 1000) : undefined; // min time = max throughput
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
          higherIsBetter: true,
        },
        {
          key: "locSecMax",
          title: "max",
          formatter: integer,
          comparable: true,
          higherIsBetter: true,
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
