import pico from "picocolors";
import { table } from "table";
import type { BenchTest } from "../bin/bench.ts";
import { type MeasuredResults, mapValues } from "./MitataBench.ts";
import {
  type ColumnGroup,
  type TableSetup,
  tableSetup,
} from "./TableReport.ts";

const { red, green } = pico;

const maxNameLength = 30;

/** report of benchmark results, including baseline results if available  */
export interface BenchmarkReport {
  benchTest: BenchTest;
  mainResult: MeasuredResults;
  baseline?: MeasuredResults;
}

/** benchmark data to report in each row */
interface ReportRow {
  name?: string;
  locSecP50?: string;
  locSecMax?: string;
  locSecMaxPercent?: string;
  locSecP50Percent?: string;
  timeMean?: string;
  timeMeanPercent?: string;
  gcTimeMean?: string;
  gcTimePercent?: string;
  cpuCacheMiss?: string;
  heap?: string;
  runs?: string;
}

type NullableValues<T> = {
  [P in keyof T]: T[P] | null;
};

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
  const { headerRows, config } = tablePrep();
  const dataRows = recordsToRows(records);
  const allRows = [...headerRows, ...dataRows];
  console.log(table(allRows, config));
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
    timeMean: prettyFloat(stats.timeMean, 2),
    locSecMax: prettyInteger(stats.locSecMax),
    locSecP50: prettyInteger(stats.locSecP50),
    gcTimeMean: prettyFloat(stats.gcTimeMean, 2),
    runs: prettyInteger(stats.runs),
    cpuCacheMiss: prettyPercent(stats.cpuCacheMiss),
    heap: prettyInteger(stats.heap),
    locSecMaxPercent: null,
    locSecP50Percent: null,
    gcTimePercent: null,
    timeMeanPercent: null,
  };
}

/** @return format a fraction as a colored +/- percentage */
export function coloredPercent(numerator: number, denominator: number): string {
  const fraction = numerator / denominator;
  const positive = fraction >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${prettyPercent(fraction)}`;
  const colored = positive ? green(percentStr) : red(percentStr);
  return colored;
}

/** format a number like .473 as a percentage like 47.3% */
function prettyPercent(fraction?: number): string | null {
  if (fraction === undefined) return null;
  return `${Math.abs(fraction * 100).toFixed(1)}%`;
}

/** convert Record style rows to an array of string[], suitable for the table library */
function recordsToRows(records: FullReportRow[]): string[][] {
  // biome-ignore format:
  const rawRows = records.map(r => [
    r.name, r.locSecMax, r.locSecMaxPercent, r.locSecP50,
    r.locSecP50Percent, r.timeMean, r.timeMeanPercent, r.gcTimeMean,
    r.gcTimePercent, r.heap, r.cpuCacheMiss, r.runs
  ]);
  return rawRows.map(row => row.map(cell => cell ?? " "));
}

/** configuration for table column and section headers */
function tablePrep(): TableSetup {
  const groups: ColumnGroup[] = [
    { columns: [{ title: "name" }] },
    {
      groupTitle: "lines / sec",
      columns: [
        { title: "max" },
        { title: "Δ%" },
        { title: "p50" },
        { title: "Δ%" },
      ],
    },
    { groupTitle: "time", columns: [{ title: "mean" }, { title: "Δ%" }] },
    { groupTitle: "gc time", columns: [{ title: "mean" }, { title: "Δ%" }] },
    {
      groupTitle: "misc",
      columns: [{ title: "heap kb" }, { title: "L1 miss" }, { title: "N" }],
    },
  ];
  return tableSetup(groups);
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

/** format an integer with commas between thousands */
function prettyInteger(x: number | undefined): string | null {
  if (x === undefined) return null;
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}

/** format a float to a specified precision with trailing zeros dropped */
function prettyFloat(x: number | undefined, digits: number): string | null {
  if (x === undefined) return null;
  return x.toFixed(digits).replace(/\.?0+$/, "");
}
