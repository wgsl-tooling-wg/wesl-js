import {
  type MeasuredResults,
  type ReportColumnGroup,
  type ResultsMapper,
  timeMs,
} from "bencher";

/** Time statistics with only mean */
export interface MeanTimeStats {
  mean?: number;
}

/** Time section showing only mean time */
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