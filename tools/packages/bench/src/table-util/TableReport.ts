import pico from "picocolors";
import { table } from "table";
import type {
  Alignment,
  ColumnUserConfig,
  SpanningCellConfig,
  TableUserConfig,
} from "table";

const { bold, red, green } = pico;

/** a single data column  */
export interface Column {
  alignment?: Alignment;
  title?: string;
}

/** A typed column that knows about the data structure it's displaying */
export interface TypedColumn<T> {
  key: keyof T;
  title: string;
  formatter?: (value: any) => string | null;
  alignment?: Alignment;
  width?: number;
  /** If true, adds a comparison percentage column after this column when baseline data is available */
  showDiff?: boolean;
  /** Key for the column that stores the comparison percentage (used with showDiff) */
  diffKey?: keyof T;
}

/** A group of typed columns */
export interface TypedColumnGroup<T> {
  groupTitle?: string;
  columns: TypedColumn<T>[];
}

/**
 * A group of columns.
 *
 * If any ColumnGroup has a groupTitle, tableSetup() will insert a row for titles.
 */
export interface ColumnGroup {
  groupTitle?: string;
  columns: Column[];
}

/** results of table preparation, ready to include in a call to `table`, like this:
 * `table([...headerRows, myDataRows], config)` */
export interface TableSetup {
  headerRows: string[][];
  config: TableUserConfig;
}

/** 
 * Create a stylish table configuration with groups of columns using the 'table' npm library.
 * 
 * Columns are can optionally grouped into sections, and vertical bars
 * are drawn between sections. Column and section headers are bolded.
 *
 * Here's an example table:
 
╔═══════════════════════════════╤══════════════════════════════╤═══════════════╤═══════════════╤══════════════════════╗
║                               │         lines / sec          │     time      │      gc       │                      ║
║                               │                              │               │               │                      ║
║ name                          │ max     Δ%     p50     Δ%    │ mean    Δ%    │ mean   Δ%     │ kb      L1 miss  N   ║
╟───────────────────────────────┼──────────────────────────────┼───────────────┼───────────────┼──────────────────────╢
║ reduceBuffer                  │ 77,045  -0.5%  74,351  -0.9% │ 1.28    +1.9% │ 0.03   +23.2% │ 2,044   1.6%     545 ║
║ --> baseline                  │ 77,463         75,044        │ 1.25          │ 0.02          │ 2,026   1.6%     556 ║
║                               │                              │               │               │                      ║
║ unity_webgpu_0000026E5689B260 │ 33,448  -1.4%  31,819  -3.9% │ 130.08  +2.8% │ 26.93  +6.7%  │ 67,895  2.1%     12  ║
║ --> baseline                  │ 33,925         33,107        │ 126.51        │ 25.24         │ 69,808  2.0%     12  ║
║                               │                              │               │               │                      ║
╚═══════════════════════════════╧══════════════════════════════╧═══════════════╧═══════════════╧══════════════════════╝
 */
export function tableSetup(groups: ColumnGroup[]): TableSetup {
  const titles = columnTitles(groups);
  const numColumns = titles.length;

  const sectionRows = groupHeaders(groups, numColumns);
  const headerRows = [...sectionRows, titles];

  const spanningCells = [...sectionSpanning(groups)];
  const config: TableUserConfig = { spanningCells, ...lineFunctions(groups) };

  return { headerRows, config };
}

/** @return a full row of header elements with blanks in between */
function groupHeaders(groups: ColumnGroup[], numColumns: number): string[][] {
  const hasHeader = groups.find(g => g.groupTitle);
  if (!hasHeader) return [];

  const sectionRow: string[] = [];
  for (const g of groups) {
    if (g.groupTitle) {
      const coloredTitle = bold(g.groupTitle);
      const section = blankPad([coloredTitle], g.columns.length);
      sectionRow.push(...section);
    } else {
      sectionRow.push(...blankPad([], g.columns.length));
    }
  }
  const blankRow = blankPad([], numColumns);
  return [sectionRow, blankRow];
}

interface LineFunctions {
  drawHorizontalLine: (index: number, size: number) => boolean;
  drawVerticalLine: (index: number, size: number) => boolean;
}

function lineFunctions(groups: ColumnGroup[]): LineFunctions {
  const sectionBorders: number[] = [];
  const groupTitles = groups.map(g => g.groupTitle);
  let headerBottom = 1;
  if (groupTitles.length > 0) {
    headerBottom = 3;

    let border = 0;
    for (const g of groups) {
      border += g.columns.length;
      sectionBorders.push(border);
    }
  }
  function drawVerticalLine(index: number, size: number): boolean {
    return index === 0 || index === size || sectionBorders.includes(index);
  }
  function drawHorizontalLine(index: number, size: number): boolean {
    return index === 0 || index === size || index === headerBottom;
  }
  return { drawHorizontalLine, drawVerticalLine };
}

/** @return spanning cells to configure for the main columns
 * currently unused due to upstream issue: https://github.com/gajus/table/issues/234
 */
function columnSpanning(groups: ColumnGroup[], row = 0): SpanningCellConfig[] {
  const columns = groups.flatMap(g => g.columns);
  const colSpan = 1;
  return columns.map((c, col) => {
    return { row, col, colSpan, alignment: c.alignment, wrapWord: false };
  });
}

function sectionSpanning(groups: ColumnGroup[]): SpanningCellConfig[] {
  let col = 0;
  const row = 0;
  const alignment: Alignment = "center";

  const spans = groups.map((g, i) => {
    const colSpan = g.columns.length;
    const cellConfig = { row, col, colSpan, alignment };
    col += colSpan;
    return cellConfig;
  });
  return spans;
}

function columnTitles(groups: ColumnGroup[]): string[] {
  return groups.flatMap(g => g.columns.map(c => bold(c.title || " ")));
}

function blankPad(arr: string[], length: number): string[] {
  if (arr.length >= length) return arr;
  return [...arr, ...Array(length - arr.length).fill(" ")];
}

/** Formatting utilities for table data */

/** format an integer with commas between thousands */
export function prettyInteger(x: number | undefined): string | null {
  if (x === undefined) return null;
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}

/** format a float to a specified precision with trailing zeros dropped */
export function prettyFloat(x: number | undefined, digits: number): string | null {
  if (x === undefined) return null;
  return x.toFixed(digits).replace(/\.?0+$/, "");
}

/** format a number like .473 as a percentage like 47.3% */
export function prettyPercent(fraction?: number): string | null {
  if (fraction === undefined) return null;
  return `${Math.abs(fraction * 100).toFixed(1)}%`;
}

/** format a fraction as a colored +/- percentage */
export function coloredPercent(numerator: number, denominator: number): string {
  const fraction = numerator / denominator;
  const positive = fraction >= 0;
  const sign = positive ? "+" : "-";
  const percentStr = `${sign}${prettyPercent(fraction)}`;
  return positive ? green(percentStr) : red(percentStr);
}

/** Common formatters for table columns */
export const formatters = {
  /** Format integers with thousand separators */
  integer: (x: number | undefined) => prettyInteger(x),
  
  /** Format floats with 2 decimal places */
  float: (x: number | undefined) => prettyFloat(x, 2),
  
  /** Format floats with custom precision */
  floatPrecision: (precision: number) => (x: number | undefined) => prettyFloat(x, precision),
  
  /** Format as percentage */
  percent: (x: number | undefined) => prettyPercent(x),
  
  /** Format duration in milliseconds */
  duration: (ms: number | undefined) => {
    if (ms === undefined) return null;
    if (ms < 1) return `${(ms * 1000).toFixed(1)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  },
  
  /** Format bytes with appropriate units */
  bytes: (bytes: number | undefined) => {
    if (bytes === undefined) return null;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`;
  },
  
  /** Format as a rate (value per unit) */
  rate: (unit: string) => (value: number | undefined) => {
    if (value === undefined) return null;
    return `${prettyInteger(value)}/${unit}`;
  },
  
  /** Truncate string to max length */
  truncate: (maxLength: number) => (str: string | undefined) => {
    if (str === undefined) return null;
    return str.length > maxLength ? `${str.slice(0, maxLength - 3)}...` : str;
  },
} as const;

/** convert Record style rows to an array of string[], suitable for the table library */
export function recordsToRows<T extends Record<string, any>>(
  records: T[],
  columnOrder: (keyof T)[]
): string[][] {
  const rawRows = records.map(record => 
    columnOrder.map(key => record[key])
  );
  return rawRows.map(row => row.map(cell => cell ?? " "));
}

/** Create a table setup using typed column definitions */
export function typedTableSetup<T>(groups: TypedColumnGroup<T>[]): TableSetup {
  const untypedGroups: ColumnGroup[] = groups.map(group => ({
    groupTitle: group.groupTitle,
    columns: group.columns.map(col => ({
      title: col.title,
      alignment: col.alignment,
    })),
  }));
  
  return tableSetup(untypedGroups);
}

/** Convert typed records to formatted string rows using typed column definitions */
export function typedRecordsToRows<T extends Record<string, any>>(
  records: T[],
  groups: TypedColumnGroup<T>[]
): string[][] {
  const allColumns = groups.flatMap(group => group.columns);
  
  const rawRows = records.map(record => 
    allColumns.map(col => {
      const value = record[col.key];
      if (col.formatter) {
        return col.formatter(value);
      }
      return value;
    })
  );
  
  return rawRows.map(row => row.map(cell => cell ?? " "));
}

/** Complete typed table builder */
export function buildTypedTable<T extends Record<string, any>>(
  groups: TypedColumnGroup<T>[],
  records: T[]
): string {
  const { headerRows, config } = typedTableSetup(groups);
  const dataRows = typedRecordsToRows(records, groups);
  const allRows = [...headerRows, ...dataRows];
  return table(allRows, config);
}

/** Configuration for comparison tables with baseline data */
export interface ComparisonTableOptions<T> {
  /** Main data to display */
  mainData: T[];
  /** Optional baseline data for comparison */
  baselineData?: T[];
  /** Function to compute comparison values for columns with showDiff: true */
  computeDiff?: (mainValue: number, baselineValue: number) => string;
  /** Column groups configuration */
  columnGroups: TypedColumnGroup<T>[];
  /** Optional prefix for baseline rows (default: "--> baseline") */
  baselinePrefix?: string;
  /** Key of the column to use as the identifier (for adding baseline prefix) */
  nameKey?: keyof T;
}

/** Build a comparison table with main data and optional baseline comparisons */
export function buildComparisonTable<T extends Record<string, any>>(
  options: ComparisonTableOptions<T>
): string {
  const {
    mainData,
    baselineData,
    computeDiff = (main, baseline) => coloredPercent(main - baseline, baseline),
    columnGroups,
    baselinePrefix = "--> baseline",
    nameKey,
  } = options;

  if (!baselineData || baselineData.length === 0) {
    // No baseline data, just build a regular table
    return buildTypedTable(columnGroups, mainData);
  }

  // Build comparison data
  const comparisonRows: T[] = [];
  
  for (let i = 0; i < mainData.length; i++) {
    const main = mainData[i];
    const baseline = baselineData[i];
    
    if (!baseline) {
      // No baseline for this row, just add the main row
      comparisonRows.push(main);
      continue;
    }

    // Create main row with comparison percentages
    const mainRowWithComparisons = { ...main } as T;
    
    // Process columns with showDiff: true
    for (const group of columnGroups) {
      for (const col of group.columns) {
        if (col.showDiff && col.diffKey) {
          const mainValue = main[col.key] as number;
          const baselineValue = baseline[col.key] as number;
          
          if (typeof mainValue === 'number' && typeof baselineValue === 'number') {
            (mainRowWithComparisons as any)[col.diffKey] = computeDiff(mainValue, baselineValue);
          }
        }
      }
    }
    
    // Create baseline row with prefix
    const baselineRow = { ...baseline } as T;
    if (nameKey) {
      (baselineRow as any)[nameKey] = `${baselinePrefix} ${baseline[nameKey]}`;
    }
    
    // Add main row, baseline row, and blank separator
    comparisonRows.push(mainRowWithComparisons);
    comparisonRows.push(baselineRow);
    
    // Add blank row as separator (except for last item)
    if (i < mainData.length - 1) {
      const blankRow = {} as T;
      comparisonRows.push(blankRow);
    }
  }

  return buildTypedTable(columnGroups, comparisonRows);
}

/* Example usage for BenchmarkReport:

// Define typed column groups for benchmark data
const benchmarkColumnGroups: TypedColumnGroup<FullReportRow>[] = [
  { columns: [{ key: "name", title: "name" }] },
  {
    groupTitle: "lines / sec",
    columns: [
      { 
        key: "locSecMax", 
        title: "max", 
        formatter: formatters.integer,
        showDiff: true,
        diffKey: "locSecMaxPercent"
      },
      { key: "locSecMaxPercent", title: "Δ%" },
      { 
        key: "locSecP50", 
        title: "p50", 
        formatter: formatters.integer,
        showDiff: true,
        diffKey: "locSecP50Percent"
      },
      { key: "locSecP50Percent", title: "Δ%" },
    ],
  },
  { 
    groupTitle: "time", 
    columns: [
      { 
        key: "timeMean", 
        title: "mean", 
        formatter: formatters.floatPrecision(2),
        showDiff: true,
        diffKey: "timeMeanPercent"
      },
      { key: "timeMeanPercent", title: "Δ%" }
    ] 
  },
  { 
    groupTitle: "gc time", 
    columns: [
      { 
        key: "gcTimeMean", 
        title: "mean", 
        formatter: formatters.floatPrecision(2),
        showDiff: true,
        diffKey: "gcTimePercent"
      },
      { key: "gcTimePercent", title: "Δ%" }
    ] 
  },
  {
    groupTitle: "misc",
    columns: [
      { key: "heap", title: "heap kb", formatter: formatters.integer },
      { key: "cpuCacheMiss", title: "L1 miss" },
      { key: "runs", title: "N", formatter: formatters.integer }
    ],
  },
];

// Usage in BenchmarkReport:
// const tableStr = buildTypedTable(benchmarkColumnGroups, allRows);
// console.log(tableStr);

// Or for comparison tables:
// const tableStr = buildComparisonTable({
//   mainData: mainRows,
//   baselineData: baselineRows,
//   columnGroups: benchmarkColumnGroups,
//   nameKey: "name",  // explicitly specify which column is the identifier
// });

*/
