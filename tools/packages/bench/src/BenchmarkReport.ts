import type { BenchTest } from "../bin/bench.ts";
import type { MeasuredResults } from "./mitata-util/MitataStats.ts";
import { mapValues } from "./mitata-util/Util.ts";
import {
  diffPercentNegative,
  floatPrecision,
  integer,
  percent,
  percentPrecision,
} from "./table-util/Formatters.ts";
import { type ColumnGroup, buildTable } from "./table-util/TableReport.ts";

const maxNameLength = 30;

/** report of benchmark results, including baseline results if available  */
export interface BenchmarkReport {
  benchTest: BenchTest;
  mainResult: MeasuredResults;
  baseline?: MeasuredResults;
}

/** preprocessed statistics for reporting */
interface SelectedStats {
  name: string;
  locSecP50: number;
  locSecMax: number;
  gcTimeMean?: number;
  timeMean: number;
  runs: number;
  cpuCacheMiss?: number;
  heap?: number;
  gcCollects?: number;
  cpuStall?: number;
}

/** benchmark data to report in each row */
interface ReportRow {
  name?: string;
  locSecP50?: number;
  locSecMax?: number;
  locSecMaxPercent?: string;
  locSecP50Percent?: string;
  timeMean?: number;
  timeMeanPercent?: string;
  gcTimeMean?: number;
  gcTimePercent?: string;
  cpuCacheMiss?: number;
  heap?: number;
  runs?: number;
  gcCollects?: number;
  cpuStall?: number;
}

/** Helper type for records with nullable values */
type NullableValues<T> = {
  [P in keyof T]: T[P] | null;
};

/** report row with all keys required, and values that may be null */
type FullReportRow = NullableValues<Required<ReportRow>>;

/** test data to report, results along with baseline if available */
interface ReportRows {
  main: FullReportRow[];
  baseline?: FullReportRow[];
}

/** log a table of benchmark results  */
export function reportResults(reports: BenchmarkReport[]): void {
  const { main, baseline } = reportsToRows(reports);
  logTable(main, baseline);
}

function reportsToRows(reports: BenchmarkReport[]): ReportRows {
  const mainRows: FullReportRow[] = [];
  const baselineRows: FullReportRow[] = []; // only if any baseline exists

  reports.forEach(report => {
    const { benchTest, mainResult, baseline } = report;

    const codeLines = getCodeLines(benchTest);

    const mainStats = selectedStats(codeLines, mainResult);
    mainRows.push(mostlyFullRow(mainStats));

    if (baseline) {
      const baseStats = selectedStats(codeLines, baseline);
      baselineRows.push(mostlyFullRow(baseStats));
    }
  });

  return {
    main: mainRows,
    baseline: baselineRows.length > 0 ? baselineRows : undefined,
  };
}

/** write table records to the console */
function logTable(
  mainRows: FullReportRow[],
  baselineRows?: FullReportRow[],
): void {
  const tableStr = buildTable(tableConfig(), mainRows, baselineRows, "name");
  console.log(tableStr);
}

/** count the number of lines of code in a bench test */
function getCodeLines(benchTest: BenchTest) {
  return benchTest.files
    .values()
    .map(text => text.split("\n").length)
    .reduce((sum, v) => sum + v, 0);
}

/** select and preprocess interesting stats for reporting  */
function selectedStats(
  codeLines: number,
  result: MeasuredResults,
): SelectedStats {
  const median = result.time.p50;
  const min = result.time.min;
  const locPerSecond = mapValues(
    { median, max: min }, // 'min' time becomes 'max' loc/sec
    x => codeLines / (x / 1000),
  );

  let gcTimeMean: number | undefined = undefined;
  const { nodeGcTime } = result;
  if (nodeGcTime) {
    gcTimeMean = nodeGcTime.inRun / result.samples.length;
  }

  return {
    locSecP50: locPerSecond.median,
    locSecMax: locPerSecond.max,
    timeMean: result.time?.avg,
    gcTimeMean,
    runs: result.samples.length,
    heap: result.heapSize?.avg,
    cpuCacheMiss: result.cpuCacheMiss,
    gcCollects: result.nodeGcTime?.collects,
    cpuStall: result.cpuStall,
    name: result.name.slice(0, maxNameLength),
  };
}

/** @return a report row with all properties set, but some values set to null */
function mostlyFullRow(stats: SelectedStats): FullReportRow {
  return {
    name: stats.name,
    timeMean: stats.timeMean,
    locSecMax: stats.locSecMax,
    locSecP50: stats.locSecP50,
    gcTimeMean: stats.gcTimeMean ?? null,
    runs: stats.runs,
    cpuCacheMiss: stats.cpuCacheMiss ?? null,
    heap: stats.heap ?? null,
    gcCollects: stats.gcCollects ?? null,
    cpuStall: stats.cpuStall ?? null,
    locSecMaxPercent: null,
    locSecP50Percent: null,
    gcTimePercent: null,
    timeMeanPercent: null,
  };
}

/** configuration for table columns and sections */
function tableConfig(): ColumnGroup<FullReportRow>[] {
  return [
    {
      columns: [{ key: "name", title: "name" }],
    },
    {
      groupTitle: "lines / sec",
      columns: [
        { key: "locSecP50", title: "p50", formatter: integer },
        { key: "locSecP50Percent", title: "Δ%", diffKey: "locSecP50" },
        { key: "locSecMax", title: "max", formatter: integer },
        { key: "locSecMaxPercent", title: "Δ%", diffKey: "locSecMax" },
      ],
    },
    {
      groupTitle: "time",
      columns: [
        {
          key: "timeMean",
          title: "mean",
          formatter: floatPrecision(2),
        },
        {
          key: "timeMeanPercent",
          title: "Δ%",
          diffKey: "timeMean",
          diffFormatter: diffPercentNegative,
        },
      ],
    },
    {
      groupTitle: "gc time",
      columns: [
        {
          key: "gcTimeMean",
          title: "mean",
          formatter: floatPrecision(2),
        },
        {
          key: "gcTimePercent",
          title: "Δ%",
          diffKey: "gcTimeMean",
          diffFormatter: diffPercentNegative,
        },
      ],
    },
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
    {
      groupTitle: "misc",
      columns: [
        { key: "heap", title: "heap kb", formatter: integer },
        { key: "gcCollects", title: "collects", formatter: integer },
        { key: "runs", title: "runs", formatter: integer },
      ],
    },
  ];
}
