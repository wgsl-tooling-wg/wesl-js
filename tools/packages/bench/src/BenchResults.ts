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
  runs?: number;
  cpuCacheMissRate?: number;
}

interface SelectedStats {
  locSecP50: number;
  locSecMax: number;
  gcTimeMean?: number;
  runs: number;
}

interface NamedStats extends SelectedStats {
  name: string;
}

const maxNameLength = 30;

export function reportResults(reports: BenchmarkReport[]): void {
  const allRows: ReportRow[] = [];

  for (const report of reports) {
    const { benchTest, mainResult, baseline } = report;

    const codeLines = getCodeLines(benchTest);
    const main = namedStats(codeLines, mainResult);

    const base = baseline && namedStats(codeLines, baseline);
    const rows = formatReport(main, base);
    allRows.push(...rows);
    if (base) allRows.push({});
  }

  logTable(allRows);
}

function formatReport(main: NamedStats, base?: NamedStats): ReportRow[] {
  const results: ReportRow[] = [];
  const { gcTimeMean, locSecMax, locSecP50 } = main;
  const mainRow: ReportRow = {
    name: main.name,
    locSecMax: prettyInteger(main.locSecMax),
    locSecP50: prettyInteger(main.locSecP50),
    gcTimeMean: prettyFloat(gcTimeMean, 2),
    runs: main.runs,
  };

  if (!base) {
    results.push(mainRow);
  } else {
    const locDiff = locSecMax - base.locSecMax;
    const locP50Diff = locSecP50 - base.locSecP50;

    mainRow.locSecP50Percent = coloredPercent(locP50Diff, base.locSecP50);
    mainRow.locSecMaxPercent = coloredPercent(locDiff, base.locSecMax);

    results.push(mainRow);

    const baseRow: ReportRow = {
      name: base.name,
      locSecMax: prettyInteger(base.locSecMax),
      locSecP50: prettyInteger(base.locSecP50),
      gcTimeMean: prettyFloat(base.gcTimeMean, 2),
    };

    results.push(baseRow);
  }

  return results;
}

function coloredPercent(numerator: number, total: number): string {
  const fraction = numerator / total;
  const positive = fraction >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${percentString(fraction)}`;
  const colored = positive ? green(percentStr) : red(percentStr);
  return colored;
}

function percentString(fraction?: number): string | undefined {
  if (fraction === undefined) return undefined;
  return `${Math.abs(fraction * 100).toFixed(1)}%`;
}

/** write the table to the console */
function logTable(records: ReportRow[]): void {
  const rawRows = records.map(r => [
    r.name,
    r.locSecMax,
    r.locSecMaxPercent,
    r.locSecP50,
    r.locSecP50Percent,
    r.gcTimeMean,
  ]);
  const rows = rawRows.map(row => row.map(cell => cell ?? ""));

  const allRows = [...headerRows(rows[0].length), ...rows];

  console.log(table(allRows, tableConfig()));
}

function headerRows(columns: number): string[][] {
  return [
    [bold("name"), bold("Lines / sec"), "", "", "", ""],
    filled("", columns),
    ["", bold("max"), bold("%"), bold("p50"), bold("%"), bold("gcTimeMean")],
  ];
}

function tableConfig(): TableUserConfig {
  // biome-ignore format:
  const spanningCells: SpanningCellConfig[] = [
    { row: 0, col: 0, colSpan: 1, alignment: "center" }, // "name" header
    { row: 0, col: 1, colSpan: 4, alignment: "center" }, // "Lines / sec" header
    { row: 1, col: 1, colSpan: 3, alignment: "center" }, // blank under "Lines / sec"
    { row: 2, col: 1, colSpan: 1, alignment: "center" }, // "max" header
    { row: 2, col: 3, colSpan: 1, alignment: "center" }, // "p50" header
    { row: 2, col: 4, colSpan: 1, alignment: "center" }, // "gcTime" header
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
      { alignment: "right" },                                 // gcTime
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

function filled(element: string, count: number): string[] {
  return Array(count).fill(element);
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
  };
}

/** count the number of lines of code in a bench test */
function getCodeLines(benchTest: BenchTest) {
  return benchTest.files
    .values()
    .map(text => text.split("\n").length)
    .reduce((sum, v) => sum + v, 0);
}

function prettyInteger(x: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}

function prettyFloat(
  x: number | undefined,
  digits: number,
): string | undefined {
  if (x === undefined) return undefined;
  return x.toFixed(digits).replace(/\.?0+$/, "");
}
