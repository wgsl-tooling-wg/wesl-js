import { type ReportSection, timeMs } from "benchforge";

/** Mean time section */
export const meanTimeSection: ReportSection = {
  title: "time",
  columns: [
    { key: "mean", title: "mean", formatter: timeMs, comparable: true, statKind: "mean" },
  ],
};
