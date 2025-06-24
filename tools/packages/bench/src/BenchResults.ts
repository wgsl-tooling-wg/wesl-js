import type { BenchTest } from "../bin/bench.ts";
import { mapValues, type MeasuredResults } from "./MitataBench.ts";
import pico from "picocolors";
import { type SpanningCellConfig, table, type TableUserConfig } from "table";

const { bold, red, green } = pico;

/** report of benchmark results, including baseline results if available  */
export interface BenchmarkReport {
  benchTest: BenchTest;
  mainResult: MeasuredResults;
  baseline?: MeasuredResults;
}

interface ReportRow {
  name?: string;
  locSecP50?: string;
  locSecMax?: string;
  locSecMaxPercent?: string;
  locSecP50Percent?: string;
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

interface SelectedStats {
  locSecP50: number;
  locSecMax: number;
  gcTimeMean?: number;
  runs: number;
  cpuCacheMiss?: number;
  heap?: number;
}

interface NamedStats extends SelectedStats {
  name: string;
}

const maxNameLength = 30;

export function reportResults(reports: BenchmarkReport[]): void {
  const allRows: FullReportRow[] = [];

  for (const report of reports) {
    const { benchTest, mainResult, baseline } = report;

    const codeLines = getCodeLines(benchTest);
    const main = namedStats(codeLines, mainResult);

    const base = baseline && namedStats(codeLines, baseline);
    const rows = formatReport(main, base);
    allRows.push(...rows);
    if (base) allRows.push({} as FullReportRow); // empty row for spacing
  }

  logTable(allRows);
}

function formatReport(main: NamedStats, base?: NamedStats): FullReportRow[] {
  const results: FullReportRow[] = [];
  const mainRow = mostlyFullRow(main);

  if (!base) {
    results.push(mainRow);
  } else {
    const locDiff = main.locSecMax - base.locSecMax;
    const locP50Diff = main.locSecP50 - base.locSecP50;
    mainRow.locSecP50Percent = coloredPercent(locP50Diff, base.locSecP50);
    mainRow.locSecMaxPercent = coloredPercent(locDiff, base.locSecMax);
    results.push(mainRow);

    const baseRow = mostlyFullRow(base);
    results.push(baseRow);
  }

  return results;
}

/** @return a report row with all properties set, but some values set to null */
function mostlyFullRow(stats: NamedStats): FullReportRow {
  return {
    name: stats.name,
    locSecMax: prettyInteger(stats.locSecMax),
    locSecP50: prettyInteger(stats.locSecP50),
    gcTimeMean: prettyFloat(stats.gcTimeMean, 2),
    runs: prettyInteger(stats.runs),
    cpuCacheMiss: prettyPercent(stats.cpuCacheMiss),
    heap: prettyInteger(stats.heap),
    locSecMaxPercent: null,
    locSecP50Percent: null,
    gcTimePercent: null,
  };
}

function coloredPercent(numerator: number, total: number): string {
  const fraction = numerator / total;
  const positive = fraction >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${prettyPercent(fraction)}`;
  const colored = positive ? green(percentStr) : red(percentStr);
  return colored;
}

function prettyPercent(fraction?: number): string | null {
  if (fraction === undefined) return null;
  return `${Math.abs(fraction * 100).toFixed(1)}%`;
}

/** write the table to the console */
function logTable(records: FullReportRow[]): void {
  const rawRows = records.map(r => [
    r.name,
    r.locSecMax,
    r.locSecMaxPercent,
    r.locSecP50,
    r.locSecP50Percent,
    r.gcTimeMean,
    r.gcTimePercent,
    r.heap,
    r.cpuCacheMiss,
    r.runs,
  ]);
  const rows = rawRows.map(row => row.map(cell => cell ?? ""));

  const allRows = [...headerRows(rows[0].length), ...rows];

  console.log(table(allRows, tableConfig()));
}

/**  @return row content for the header */
function headerRows(columns: number): string[][] {
  return [
    blankPad([bold("name"), bold("Lines / sec")], columns),
    blankPad([], columns),
    blankPad(
      [
        "",
        bold("max"),
        bold("%"),
        bold("p50"),
        bold("%"),
        bold("gc time"),
        bold("%"),
        bold("heap"),
        bold("L1 miss"),
        bold("runs"),
      ],
      columns,
    ),
  ];
}

/** @return configuration for the table header and separator lines */
function tableConfig(): TableUserConfig {
  // biome-ignore format:
  const spanningCells: SpanningCellConfig[] = [
    { row: 0, col: 0, colSpan: 1, alignment: "center" }, // "name" header
    { row: 0, col: 1, colSpan: 4, alignment: "center" }, // "Lines / sec" header
    { row: 1, col: 1, colSpan: 3, alignment: "center" }, // blank under "Lines / sec"
    { row: 2, col: 1, colSpan: 1, alignment: "center" }, // "max" header
    { row: 2, col: 3, colSpan: 1, alignment: "center" }, // "p50" header
    { row: 2, col: 4, colSpan: 1, alignment: "center" }, // "gc time" header
    { row: 2, col: 6, colSpan: 1, alignment: "center" }, // "heap" header
    { row: 2, col: 7, colSpan: 1, alignment: "center" }, // "L1 miss" header
    { row: 2, col: 8, colSpan: 1, alignment: "center" }, // "runs" header
  ];

  const config: TableUserConfig = {
    spanningCells,
    // biome-ignore format:
    columns: [
      { alignment: "left" },                                  // name
      { alignment: "right" },                                 // loc/Sec max
      { alignment: "left", paddingLeft: 0, paddingRight: 2 }, // %
      { alignment: "right" },                                 // loc/Sec p50
      { alignment: "left", paddingLeft: 0, paddingRight: 2 }, // %
      { alignment: "right" },                                 // gc time
      { alignment: "left", paddingLeft: 0, paddingRight: 2 }, // %
      { alignment: "right" },                                 // heap
      { alignment: "right" },                                 // L1 miss
      { alignment: "right" },                                 // runs
    ],
    drawHorizontalLine: (index, size) => {
      return index === 0 || index === 3 || index === size;
    },
    drawVerticalLine: (index, size) => {
      return index === 0 || index === 1 || index === size;
    },
  };
  return config;
}

function blankPad(arr: string[], length: number): string[] {
  if (arr.length >= length) return arr;
  return [...arr, ...Array(length - arr.length).fill("")];
}

function namedStats(codeLines: number, measured: MeasuredResults): NamedStats {
  const stats = selectedStats(codeLines, measured);
  const namedStats = {
    name: measured.name.slice(0, maxNameLength),
    ...stats,
  };
  return namedStats;
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
  // console.log(`time.avg: ${result.time.avg}`);
  // console.log(`gcTimeAvg: ${result.gcTime?.avg}`);
  return {
    locSecP50: locPerSecond.median,
    locSecMax: locPerSecond.max,
    gcTimeMean: result.gcTime?.avg,
    runs: result.samples.length,
    heap: result.heapSize?.avg,
  };
}

/** count the number of lines of code in a bench test */
function getCodeLines(benchTest: BenchTest) {
  return benchTest.files
    .values()
    .map(text => text.split("\n").length)
    .reduce((sum, v) => sum + v, 0);
}

function prettyInteger(x: number | undefined): string | null {
  if (x === undefined) return null;
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}

function prettyFloat(x: number | undefined, digits: number): string | null {
  if (x === undefined) return null;
  return x.toFixed(digits).replace(/\.?0+$/, "");
}
