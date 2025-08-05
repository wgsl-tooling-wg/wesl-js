import type { MeasuredResults } from "./MeasuredResults.ts";
import type { UnionToIntersection } from "./TypeUtil.ts";
import { diffPercentBenchmark } from "./table-util/Formatters.ts";
import {
  type AnyColumn,
  buildTable,
  type ColumnGroup,
  type ResultGroup,
} from "./table-util/TableReport.ts";

/** A set of benchmark results with an optional baseline for comparison */
export interface ReportGroup {
  reports: BenchmarkReport[];
  baseline?: BenchmarkReport;
}

/** results from running a benchmark */
export interface BenchmarkReport {
  name: string;
  measuredResults: MeasuredResults;
  metadata?: UnknownRecord;
}

/** a set of columns, grouped together in the report table */
export interface ReportColumnGroup<T> {
  groupTitle?: string;
  columns: ReportColumn<T>[];
}

/** a single column in the report table */
export type ReportColumn<T> = AnyColumn<T> & {
  /** if true, a diff column will be added after this column when baseline data is present */
  comparable?: boolean;
};

/** Maps benchmark results to table columns
 * @typeParam T - Shape of extracted data (e.g. `{mean: number, p95: number}`)
 */
export interface ResultsMapper<
  T extends Record<string, any> = Record<string, any>,
> {
  extract(results: MeasuredResults, metadata?: UnknownRecord): T;
  columns(): ReportColumnGroup<T>[];
}
export type UnknownRecord = Record<string, unknown>;

/** Extracts the statistics type from a single section */
type SectionStats<S> = S extends ResultsMapper<infer T> ? T : never;

interface ReportRowBase {
  name: string;
}

/** Data row record type. e.g., {name: string, mean: number, p50: number}
 * constructed by combining section
 */
type ReportRowData<S extends ReadonlyArray<ResultsMapper<any>>> =
  ReportRowBase & UnionToIntersection<SectionStats<S[number]>>;

/** Generate a formatted table report from benchmark results with optional baseline comparisons */
export function reportResults<S extends ReadonlyArray<ResultsMapper<any>>>(
  groups: ReportGroup[],
  sections: S,
): string {
  const resultGroups = groups.map(group => resultGroupValues(group, sections));
  const hasBaseline = resultGroups.some(g => g.baseline);
  const columnGroups = createColumnGroups(sections, hasBaseline);

  return buildTable(columnGroups, resultGroups);
}

/** extract all needed values for this ReportGroup */
function resultGroupValues<S extends ReadonlyArray<ResultsMapper<any>>>(
  group: ReportGroup,
  sections: S,
): ResultGroup<ReportRowData<S>> {
  const { reports, baseline } = group;
  const results = valuesForReports(reports, sections);
  const baselineRow = baseline && valuesForReports([baseline], sections)[0];

  return { results, baseline: baselineRow };
}

/** Build report rows by extracting stats from all sections */
export function valuesForReports<S extends ReadonlyArray<ResultsMapper<any>>>(
  reports: BenchmarkReport[],
  sections: S,
): ReportRowData<S>[] {
  return reports.map(report => ({
    name: truncate(report.name),
    ...extractReportValues(report, sections),
  })) as ReportRowData<S>[];
}

/** Select and merge statistics values from all sections */
function extractReportValues(
  report: BenchmarkReport,
  sections: ReadonlyArray<ResultsMapper<any>>,
): UnknownRecord {
  const { measuredResults, metadata } = report;
  const combinedEntries = sections.flatMap(s => {
    const record: UnknownRecord = s.extract(measuredResults, metadata);
    return Object.entries(record);
  });
  return Object.fromEntries(combinedEntries);
}

/** Create column groups from sections, injecting diff columns if needed */
function createColumnGroups<S extends ReadonlyArray<ResultsMapper<any>>>(
  sections: S,
  hasBaseline: boolean,
): ColumnGroup<ReportRowData<S>>[] {
  const nameColumn: ColumnGroup<ReportRowData<S>> = {
    columns: [{ key: "name" as keyof ReportRowData<S>, title: "name" }],
  };

  const reportColumnGroups = sections.flatMap(section => section.columns());
  const columnGroups = hasBaseline
    ? injectDiffColumns(reportColumnGroups)
    : reportColumnGroups;

  return [nameColumn, ...columnGroups];
}

/** Inject diff columns after comparable fields */
function injectDiffColumns<T>(
  reportGroups: ReportColumnGroup<T>[],
): ColumnGroup<T>[] {
  return reportGroups.map(group => ({
    groupTitle: group.groupTitle,
    columns: group.columns.flatMap(col => {
      if (col.comparable) {
        const key = `${String(col.key)}Diff` as keyof T;
        const diffCol = {
          title: "Δ%",
          key,
          diffKey: col.key,
          diffFormatter: diffPercentBenchmark,
        };
        return [col, diffCol];
      }
      return [col];
    }),
  }));
}

/** Truncate long names to fit table width */
function truncate(name: string): string {
  const maxLength = 30;
  return name.length > maxLength ? name.slice(0, maxLength - 3) + "..." : name;
}
