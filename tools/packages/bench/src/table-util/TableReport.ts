import pico from "picocolors";
import { table } from "table";
import type {
  Alignment,
  ColumnUserConfig,
  SpanningCellConfig,
  TableUserConfig,
} from "table";

const { bold, red, green } = pico;

/** A typed column that knows about the data structure it's displaying */
export interface Column<T> {
  key: keyof T;
  title: string;
  formatter?: (value: any) => string | null;
  alignment?: Alignment;
  width?: number;
  /** if set, this column holds a synthesized comparison value
   * comparing the value in selected by the diffKey against the
   * corresponding baseline value.
   */
  diffKey?: keyof T;
}

/** A group of typed columns */
export interface ColumnGroup<T> {
  groupTitle?: string;
  columns: Column<T>[];
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
export function tableSetup<T>(groups: ColumnGroup<T>[]): TableSetup {
  const titles = columnTitles(groups);
  const numColumns = titles.length;

  const sectionRows = groupHeaders(groups, numColumns);
  const headerRows = [...sectionRows, titles];

  const spanningCells = [...sectionSpanning(groups)];
  const config: TableUserConfig = { spanningCells, ...lineFunctions(groups) };

  return { headerRows, config };
}

/** @return a full row of header elements with blanks in between */
function groupHeaders<T>(
  groups: ColumnGroup<T>[],
  numColumns: number,
): string[][] {
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

function lineFunctions<T>(groups: ColumnGroup<T>[]): LineFunctions {
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
function _columnSpanning<T>(
  groups: ColumnGroup<T>[],
  row = 0,
): SpanningCellConfig[] {
  const columns = groups.flatMap(g => g.columns);
  const colSpan = 1;
  return columns.map((c, col) => {
    return { row, col, colSpan, alignment: c.alignment, wrapWord: false };
  });
}

function sectionSpanning<T>(
  groups: ColumnGroup<T>[],
): SpanningCellConfig[] {
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

function columnTitles<T>(groups: ColumnGroup<T>[]): string[] {
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
export function prettyFloat(
  x: number | undefined,
  digits: number,
): string | null {
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
  floatPrecision: (precision: number) => (x: number | undefined) =>
    prettyFloat(x, precision),

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
    const units = ["B", "KB", "MB", "GB", "TB"];
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
  groups: ColumnGroup<T>[],
): string[][] {
  const allColumns = groups.flatMap(group => group.columns);

  const rawRows = records.map(record =>
    allColumns.map(col => {
      const value = record[col.key];
      if (col.formatter) {
        return col.formatter(value);
      }
      return value;
    }),
  );

  return rawRows.map(row => row.map(cell => cell ?? " "));
}


/** Compute diff values for comparison columns and add to main record */
function addComparisons<T extends Record<string, any>>(
  groups: ColumnGroup<T>[],
  mainRecord: T,
  baselineRecord: T,
): T {
  const comparisonColumns = groups
    .flatMap(g => g.columns)
    .filter(col => col.diffKey);
  const updatedMain = { ...mainRecord };

  for (const col of comparisonColumns) {
    const mainValue = Number(mainRecord[col.diffKey!]);
    const baselineValue = Number(baselineRecord[col.diffKey!]);

    if (
      !Number.isNaN(mainValue) &&
      !Number.isNaN(baselineValue) &&
      baselineValue !== 0
    ) {
      const diff = mainValue - baselineValue;
      (updatedMain as any)[col.key] = coloredPercent(diff, baselineValue);
    }
  }

  return updatedMain;
}

/** Build a comparison table with automatic diff percentage calculation */
export function buildComparisonTable<T extends Record<string, any>>(
  groups: ColumnGroup<T>[],
  mainRecords: T[],
  baselineRecords?: T[],
  nameKey: keyof T = "name" as keyof T,
): string {
  let allRecords: T[];

  if (baselineRecords && baselineRecords.length > 0) {
    // Interleave main and baseline records
    allRecords = [];
    for (let i = 0; i < mainRecords.length; i++) {
      const mainRecord = mainRecords[i];
      const baselineRecord = baselineRecords[i];

      if (baselineRecord) {
        const updatedMain = addComparisons(groups, mainRecord, baselineRecord);

        allRecords.push(updatedMain);

        // Add baseline record with modified name
        const updatedBaseline = { ...baselineRecord };
        (updatedBaseline as any)[nameKey] = `--> baseline`;
        allRecords.push(updatedBaseline);

        // Add blank row for separation (except for the last group)
        if (i < mainRecords.length - 1) {
          allRecords.push({} as T);
        }
      } else {
        allRecords.push(mainRecord);
      }
    }
  } else {
    // No baseline data, use main records as-is (but filter out diff columns)
    const filteredGroups = groups.map(group => ({
      ...group,
      columns: group.columns.filter(col => !col.diffKey),
    }));
    return buildTable(filteredGroups, mainRecords);
  }

  return buildTable(groups, allRecords);
}

function buildTable<T extends Record<string, any>>(
  groups: ColumnGroup<T>[],
  records: T[],
): string {
  const { headerRows, config } = tableSetup(groups);
  const dataRows = recordsToRows(records, groups);
  const allRows = [...headerRows, ...dataRows];
  return table(allRows, config);
}