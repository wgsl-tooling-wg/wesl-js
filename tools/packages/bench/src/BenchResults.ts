import type { BenchTest } from "../bin/bench.ts";
import { mapValues, type MeasuredResults } from "./MitataBench.ts";
import { type TableRow, TextTable } from "./TextTable.ts";

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
    const mainStats = selectedStats(benchTest, mainResult);
    const mainNamedStats = {
      name: mainResult.name.slice(0, maxNameLength),
      ...mainStats,
    };

    const formatted = formatStats(mainNamedStats);
    if (baseline) {
      const withDiff = { ...formatted, "%": "+1.0%" };
      allRows.push(withDiff);
    } else {
      allRows.push(formatted);
    }

    if (baseline) {
      const baselineStats = selectedStats(benchTest, baseline);
      const baselineNamedStats = { name: baseline.name, ...baselineStats, };

      const formatted = formatStats(baselineNamedStats);
      allRows.push(formatted);
    }
  }

  const table = new TextTable();
  const result = table.report(allRows);
  console.log(result + "\n");
}

/** select and preprocess interesting stats for reporting  */
function selectedStats(
  benchTest: BenchTest,
  result: MeasuredResults,
): SelectedStats {
  const codeLines = getCodeLines(benchTest);
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
