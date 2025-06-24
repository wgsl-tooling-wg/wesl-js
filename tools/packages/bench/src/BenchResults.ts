import type { BenchTest } from "../bin/bench.ts";
import { mapValues, type MeasuredResults } from "./MitataBench.ts";
import pico from "picocolors";
import { type SpanningCellConfig, table, type TableUserConfig } from "table";

export interface BenchmarkReport {
  benchTest: BenchTest;
  mainResult: MeasuredResults;
  baseline?: MeasuredResults;
}

interface ReportRow {
  name?: string;
  locSecP50?: string;
  locSecMin?: string;
  locSecMinPercent?: string;
  locSecP50Percent?: string;
}

interface SelectedStats {
  locSecP50: number;
  locSecMin: number;
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
  if (base) {
    const diff = main.locSecMin - base.locSecMin;
    const locSecMinPercent = percentString(diff, base.locSecMin);
    const formattedMain: ReportRow = {
      name: main.name,
      locSecMin: formatNumber(main.locSecMin),
      locSecMinPercent,
      locSecP50: formatNumber(main.locSecP50),
    };
    results.push(formattedMain);
    results.push(formatStats(base));
  }
  return results;
}

function percentString(numerator: number, total:number): string {
  const diffPercent = (numerator / total) * 100;
  const positive = diffPercent >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${Math.abs(diffPercent).toFixed(1)}%`;
  const colored = positive ? pico.green(percentStr) : pico.red(percentStr);
  return colored;
}

function logTable(records: ReportRow[]): void {
  const rawRows = records.map(r => [
    r.name,
    r.locSecMin,
    r.locSecMinPercent,
    r.locSecP50,
  ]);
  const rows = rawRows.map(row => row.map(cell => cell ?? ""));

  const columnCount = rows[0].length;

  const headerLines = [[pico.bold("name"), pico.bold("Lines / sec"), "", ""]];
  const blankRow = filled("", columnCount);
  const allRows = [
    ...headerLines,
    blankRow,
    ["", pico.bold("min"), pico.bold("%"), pico.bold("p50")],
    ...rows,
  ];

  const spanningCells: SpanningCellConfig[] = [
    { row: 0, col: 1, colSpan: 3, alignment: "center" },
    { row: 1, col: 1, colSpan: 3, alignment: "center" },
    { row: 2, col: 1, colSpan: 1, alignment: "center" },
    { row: 2, col: 3, colSpan: 1, alignment: "center" },
  ];
  const config: TableUserConfig = {
    spanningCells,
    columns: [
      { alignment: "left" },
      { alignment: "right" },
      { alignment: "left", paddingLeft: 0 },
      { alignment: "right" },
      { alignment: "left", paddingLeft: 0 },
      { alignment: "right" },
    ],
    drawHorizontalLine: (index, size) => {
      return index === 0 || index === 3 || index === size;
    },
    drawVerticalLine: (index, size) => {
      return index === 0 || index === 1 || index === size;
    },
  };
  console.log(table(allRows, config));
}

function filled(element: string, count: number): string[] {
  return Array(count).fill(element);
}

function locSecDiff(base: SelectedStats, current: SelectedStats): ReportRow {
  const diff = current.locSecMin - base.locSecMin;
  const positive = diff >= 0;
  const diffPercent = (diff / base.locSecMin) * 100;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${Math.abs(diffPercent).toFixed(1)}%`;
  const colored = positive ? pico.green(percentStr) : pico.red(percentStr);
  return { locSecMinPercent: colored };
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
  const locPerSecond = mapValues({ median, min }, x => codeLines / (x / 1000));
  return {
    locSecP50: locPerSecond.median,
    locSecMin: locPerSecond.min,
  };
}

/** count the number of lines of code in a bench test */
function getCodeLines(benchTest: BenchTest) {
  return benchTest.files
    .values()
    .map(text => text.split("\n").length)
    .reduce((sum, v) => sum + v, 0);
}

function formatStats(stats: NamedStats): ReportRow {
  const { locSecP50, locSecMin, name } = stats;
  return {
    name,
    locSecP50: formatNumber(locSecP50),
    locSecMin: formatNumber(locSecMin),
  };
}

function formatNumber(x: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}
