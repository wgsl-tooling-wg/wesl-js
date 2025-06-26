import type { BenchTest } from "../bin/bench.ts";
import type { MeasuredResults } from "./mitata-util/MitataBench.ts";
import {
  type TypedColumnGroup,
  buildComparisonTable,
  formatters,
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
  const allMainRows: FullReportRow[] = [];
  const allBaselineRows: FullReportRow[] = [];

  for (const report of reports) {
    const { benchTest, mainResult, baseline } = report;

    const codeLines = getCodeLines(benchTest);
    const main = selectedStats(codeLines, mainResult);

    const base = baseline && selectedStats(codeLines, baseline);
    const { mainRows, baselineRows } = generateDataRows(main, base);
    
    allMainRows.push(...mainRows);
    if (baselineRows) {
      allBaselineRows.push(...baselineRows);
    }
  }

  logTable(allMainRows, allBaselineRows.length > 0 ? allBaselineRows : undefined);
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
): { mainRows: FullReportRow[]; baselineRows?: FullReportRow[] } {
  const mainRows: FullReportRow[] = [mostlyFullRow(main)];
  const baselineRows: FullReportRow[] | undefined = base ? [mostlyFullRow(base)] : undefined;
  
  return { mainRows, baselineRows };
}

/** write table records to the console */
function logTable(mainRows: FullReportRow[], baselineRows?: FullReportRow[]): void {
  const groups = getBenchmarkColumns();
  const tableStr = buildComparisonTable(groups, mainRows, baselineRows, "name");
  console.log(tableStr);
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
        { key: "locSecMaxPercent", title: "Δ%", diffKey: "locSecMax" },
        { key: "locSecP50", title: "p50", formatter: formatters.integer },
        { key: "locSecP50Percent", title: "Δ%", diffKey: "locSecP50" },
      ],
    },
    { 
      groupTitle: "time", 
      columns: [
        { key: "timeMean", title: "mean", formatter: formatters.floatPrecision(2) },
        { key: "timeMeanPercent", title: "Δ%", diffKey: "timeMean" }
      ] 
    },
    { 
      groupTitle: "gc time", 
      columns: [
        { key: "gcTimeMean", title: "mean", formatter: formatters.floatPrecision(2) },
        { key: "gcTimePercent", title: "Δ%", diffKey: "gcTimeMean" }
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
