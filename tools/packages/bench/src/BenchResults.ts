import type { BenchTest } from "../bin/bench.ts";
import { mapValues, type MeasuredResults } from "./MitataBench.ts";
import pico from "picocolors";
import Table from "cli-table3";

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
    const mainFormatted = formatStats(main.namedStats);

    if (baseline) {
      const base = namedStats(codeLines, baseline);
      const diffStr = locSecDiff(base.stats, main.stats);
      const withDiff = { ...mainFormatted, ...diffStr };
      allRows.push(withDiff);
      allRows.push(formatStats(base.namedStats));
    } else {
      allRows.push(mainFormatted);
    }
    allRows.push({}); // empty row between tests
  }

  const table = recordsToTable(allRows);
  console.log(table.toString() + "\n");
}

function recordsToTable(records: ReportRow[]): Table.Table {
  const table = new Table();
  table.push(["name", { colSpan: 3, hAlign: "center", content: "LOC/sec" }]);
  table.push(["", pico.bold("min"), pico.bold("min %"), pico.bold("p50")]);
  const rows = records.map(r => [r.name, r.locSecMin, r.locSecMinPercent, r.locSecP50]);
  table.push(...rows);
  return table;
}

function locSecDiff(
  base: SelectedStats,
  current: SelectedStats,
): ReportRow{
  const diff = current.locSecMin - base.locSecMin;
  const diffPercent = (diff / base.locSecMin) * 100;
  const positive = diffPercent >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${Math.abs(diffPercent).toFixed(1)}%`;
  const colored = positive ? pico.green(percentStr) : pico.red(percentStr);
  return { locSecMinPercent: colored };
}

function namedStats(
  codeLines: number,
  measured: MeasuredResults,
): {
  stats: SelectedStats;
  namedStats: NamedStats;
} {
  const stats = selectedStats(codeLines, measured);
  const namedStats = {
    name: measured.name.slice(0, maxNameLength),
    ...stats,
  };
  return { stats, namedStats };
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
