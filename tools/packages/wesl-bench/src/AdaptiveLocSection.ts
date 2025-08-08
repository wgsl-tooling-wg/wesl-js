import {
  integer,
  type MeasuredResults,
  type ReportColumnGroup,
  type ResultsMapper,
} from "bencher";

/** Lines of code throughput with confidence intervals */
export interface AdaptiveLocStats {
  lines?: number;
  locSecMean?: number;
  locCI?: number; // confidence interval percentage
  locSecP50?: number;
}

export const adaptiveLocSection: ResultsMapper<AdaptiveLocStats> = {
  extract: (results: MeasuredResults, metadata?: any) => {
    const lines = metadata?.linesOfCode || 0;

    const locSecMean = results.time?.avg
      ? lines / (results.time.avg / 1000)
      : undefined;

    const locSecP50 = results.time?.p50
      ? lines / (results.time.p50 / 1000)
      : undefined;

    // Use the confidence interval from adaptive mode
    const locCI = results.confidenceInterval?.percentage;

    return { lines, locSecMean, locCI, locSecP50 };
  },
  columns: (): ReportColumnGroup<AdaptiveLocStats>[] => [
    {
      groupTitle: "lines / sec",
      columns: [
        {
          key: "locSecMean",
          title: "mean",
          formatter: integer,
          comparable: true,
        },
        {
          key: "locCI",
          title: "±CI",
          formatter: v => (typeof v === "number" ? `±${v.toFixed(1)}%` : ""),
        },
        {
          key: "locSecP50",
          title: "p50",
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
