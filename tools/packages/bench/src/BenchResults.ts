import type { BenchTest } from "../bin/bench.ts";
import { mapValues, type MeasuredResults } from "./MitataBench.ts";
import { type TableRow, TextTable } from "./TextTable.ts";
import pico from 'picocolors';

export interface BenchmarkReport {
  benchTest: BenchTest;
  mainResult: MeasuredResults;
  baseline?: MeasuredResults;
}

interface StringStats extends TableRow {
  "LOC/sec p50": string;
  "LOC/sec min": string;
  name: string;
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
  const allRows: TableRow[] = [];

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

  const table = new TextTable();
  const result = table.report(allRows);
  console.log(result + "\n");
}

function locSecDiff(
  base: SelectedStats,
  current: SelectedStats,
): Record<string, string> {
  const diff = current.locSecMin - base.locSecMin;
  const diffPercent = (diff / base.locSecMin) * 100;
  const positive = diffPercent >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${Math.abs(diffPercent).toFixed(1)}%`;
  const colored = positive ? pico.green(percentStr) : pico.red(percentStr);
  return { "min %": colored };
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

function formatStats(stats: NamedStats): StringStats {
  const { locSecP50, locSecMin, name } = stats;
  return {
    name,
    "LOC/sec p50": formatNumber(locSecP50),
    "LOC/sec min": formatNumber(locSecMin),
  };
}

function formatNumber(x: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}
