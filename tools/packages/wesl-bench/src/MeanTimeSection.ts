import {
  type MeasuredResults,
  type ReportColumnGroup,
  type ResultsMapper,
  timeMs,
} from "bencher";

/** Mean time statistics */
export interface MeanTimeStats {
  mean?: number;
}

/** @return mean time section */
export const meanTimeSection: ResultsMapper<MeanTimeStats> = {
  extract: (results: MeasuredResults) => ({
    mean: results.time?.avg,
  }),
  columns: (): ReportColumnGroup<MeanTimeStats>[] => [
    {
      groupTitle: "time",
      columns: [
        {
          key: "mean",
          title: "mean",
          formatter: timeMs,
          comparable: true,
        },
      ],
    },
  ],
};
