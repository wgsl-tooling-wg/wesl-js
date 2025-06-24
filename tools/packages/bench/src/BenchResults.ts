import type { BenchTest } from "../bin/bench.ts";
import { mapValues, type MeasuredResults } from "./MitataBench.ts";
import pico from "picocolors";
import { type SpanningCellConfig, table, type TableUserConfig } from "table";

const { bold, red, green } = pico;

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
    const locDiff = main.locSecMin - base.locSecMin;
    const locP50Diff = main.locSecP50 - base.locSecP50;

    const formattedMain: ReportRow = {
      name: main.name,
      locSecMin: prettyInteger(main.locSecMin),
      locSecMinPercent: percentString(locDiff, base.locSecMin),
      locSecP50: prettyInteger(main.locSecP50),
      locSecP50Percent: percentString(locP50Diff, base.locSecP50),
    };
    results.push(formattedMain);

    const formattedBase: ReportRow = {
      name: base.name,
      locSecMin: prettyInteger(base.locSecMin),
      locSecP50: prettyInteger(base.locSecP50),
    };

    results.push(formattedBase);
  } else {
    const formattedMain: ReportRow = {
      name: main.name,
      locSecMin: prettyInteger(main.locSecMin),
      locSecP50: prettyInteger(main.locSecP50),
    };
    results.push(formattedMain);
  }
  return results;
}

function percentString(numerator: number, total: number): string {
  const diffPercent = (numerator / total) * 100;
  const positive = diffPercent >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${Math.abs(diffPercent).toFixed(1)}%`;
  const colored = positive ? green(percentStr) : red(percentStr);
  return colored;
}

/** write the table to the console */
function logTable(records: ReportRow[]): void {
  const rawRows = records.map(r => [
    r.name,
    r.locSecMin,
    r.locSecMinPercent,
    r.locSecP50,
    r.locSecP50Percent,
  ]);
  const rows = rawRows.map(row => row.map(cell => cell ?? ""));

  const allRows = [...headerRows(rows[0].length), ...rows];

  console.log(table(allRows, tableConfig()));
}

function headerRows(columns: number): string[][] {
  return [
    [bold("name"), bold("Lines / sec"), "", "", ""],
    filled("", columns),
    ["", bold("min"), bold("%"), bold("p50"), bold("%")],
  ];
}

function tableConfig(): TableUserConfig {
  // biome-ignore format:
  const spanningCells: SpanningCellConfig[] = [
    { row: 0, col: 1, colSpan: 4, alignment: "center" }, // "Lines / sec" header
    { row: 1, col: 1, colSpan: 3, alignment: "center" }, // blank under "Lines / sec"
    { row: 2, col: 1, colSpan: 1, alignment: "center" }, // "min" header
    { row: 2, col: 3, colSpan: 1, alignment: "center" }, // "p50" header
  ];

  const config: TableUserConfig = {
    spanningCells,
    // biome-ignore format:
    columns: [
      { alignment: "left" },                                  // name
      { alignment: "right" },                                 // loc/Sec min
      { alignment: "left", paddingLeft: 0, paddingRight: 2 }, // %
      { alignment: "right" },                                 // loc/Sec p50
      { alignment: "left", paddingLeft: 0, paddingRight: 2 }, // %
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

function prettyInteger(x: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}
