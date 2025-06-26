import type { BenchTest } from "../bin/bench.ts";
import type { MeasuredResults } from "./mitata-util/MitataBench.ts";
import {
  type TypedColumnGroup,
  buildTypedTable,
  formatters,
  coloredPercent,
  prettyFloat,
  prettyInteger,
  prettyPercent,
} from "./table-util/TableReport.ts";
import { mapValues } from "./mitata-util/Util.ts";

const maxNameLength = 30;

/** Helper type for records with nullable values */
type NullableValues<T> = {
  [P in keyof T]: T[P] | null;
};

/** report of benchmark results, including baseline results if available  */
export interface BenchmarkReport {
  benchTest: BenchTest;
  mainResult: MeasuredResults;
  baseline?: MeasuredResults;
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
}

/** report row with all keys required, and values that may be null */
type FullReportRow = NullableValues<Required<ReportRow>>;

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
}

/** log a table of benchmark results  */
export function reportResults(reports: BenchmarkReport[]): void {
  const allRows: FullReportRow[] = [];

  for (const report of reports) {
    const { benchTest, mainResult, baseline } = report;

    const codeLines = getCodeLines(benchTest);
    const main = selectedStats(codeLines, mainResult);

    const base = baseline && selectedStats(codeLines, baseline);
    const rows = generateDataRows(main, base);
    allRows.push(...rows);
  }

  logTable(allRows);
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
    cpuCacheMiss: cpuCacheMiss(result),
    name: result.name.slice(0, maxNameLength),
  };
}

/** @return formatted table data for the selected statistics */
function generateDataRows(
  main: SelectedStats,
  base?: SelectedStats,
): FullReportRow[] {
  if (base) {
    return mainAndBaseRows(main, base);
  } else {
    return [mostlyFullRow(main)];
  }
}

/** write table records to the console */
function logTable(records: FullReportRow[]): void {
  const groups = getBenchmarkColumns();
  const tableStr = buildTypedTable(groups, records);
  console.log(tableStr);
}

/**
 * @return formatted table data for a main row with comparision % values inserted
 * and a baseline row */
function mainAndBaseRows(
  main: SelectedStats,
  base: SelectedStats,
): FullReportRow[] {
  const mainRow = mostlyFullRow(main);
  const locDiff = main.locSecMax - base.locSecMax;
  const locP50Diff = main.locSecP50 - base.locSecP50;
  mainRow.locSecP50Percent = coloredPercent(locP50Diff, base.locSecP50);
  mainRow.locSecMaxPercent = coloredPercent(locDiff, base.locSecMax);
  const timeDiff = main.timeMean - base.timeMean;
  mainRow.timeMeanPercent = coloredPercent(timeDiff, base.timeMean);

  if (main.gcTimeMean && base.gcTimeMean) {
    const gcDiff = main.gcTimeMean - base.gcTimeMean;
    mainRow.gcTimePercent = coloredPercent(gcDiff, base.gcTimeMean);
  }

  const blankRow = {} as FullReportRow;
  const baseRow = mostlyFullRow(base);
  return [mainRow, baseRow, blankRow];
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
    locSecMaxPercent: null,
    locSecP50Percent: null,
    gcTimePercent: null,
    timeMeanPercent: null,
  };
}

/** configuration for table column and section headers */
function getBenchmarkColumns(): TypedColumnGroup<FullReportRow>[] {
  return [
    { 
      columns: [
        { key: "name", title: "name" }
      ] 
    },
    {
      groupTitle: "lines / sec",
      columns: [
        { key: "locSecMax", title: "max", formatter: formatters.integer },
        { key: "locSecMaxPercent", title: "Δ%" },
        { key: "locSecP50", title: "p50", formatter: formatters.integer },
        { key: "locSecP50Percent", title: "Δ%" },
      ],
    },
    { 
      groupTitle: "time", 
      columns: [
        { key: "timeMean", title: "mean", formatter: formatters.floatPrecision(2) },
        { key: "timeMeanPercent", title: "Δ%" }
      ] 
    },
    { 
      groupTitle: "gc time", 
      columns: [
        { key: "gcTimeMean", title: "mean", formatter: formatters.floatPrecision(2) },
        { key: "gcTimePercent", title: "Δ%" }
      ] 
    },
    {
      groupTitle: "misc",
      columns: [
        { key: "heap", title: "heap kb", formatter: formatters.integer },
        { key: "cpuCacheMiss", title: "L1 miss", formatter: formatters.percent },
        { key: "runs", title: "N", formatter: formatters.integer }
      ],
    },
  ];
}

/** return the CPU L1 cache miss rate */
function cpuCacheMiss(result: MeasuredResults): number | undefined {
  if (result.cpu?.l1) {
    const { cpu } = result;
    const { l1 } = cpu;
    const total = cpu.instructions?.loads_and_stores?.avg;
    const loadMiss = l1?.miss_loads?.avg;
    const storeMiss = l1?.miss_stores?.avg; // LATER do store misses cause stalls too?
    if (total === undefined) return undefined;
    if (loadMiss === undefined || storeMiss === undefined) return undefined;

    const miss = loadMiss + storeMiss;
    return miss / total;
  }
  // TBD linux is also supported in @mitata/counters
  return undefined;
}
