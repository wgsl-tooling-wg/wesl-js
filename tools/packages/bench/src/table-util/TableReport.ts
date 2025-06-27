import pico from "picocolors";
import type { Alignment, SpanningCellConfig, TableUserConfig } from "table";
import { table } from "table";
import { diffPercent } from "./Formatters.ts";

const { bold } = pico;

/** a column of data in the table, with optional metadata  for formatting */
export interface Column<T> extends ColumnFormat<T> {
  formatter?: (value: any) => string | null;
  diffKey?: undefined;
}

/** a difference column in the table that compares */
export interface DiffColumn<T> extends ColumnFormat<T> {
  diffFormatter?: (value: any, baseline: any) => string | null;
  formatter?: undefined;

  /** if set, this column holds a synthesized comparison value
   * comparing the value in selected by the diffKey against the
   * corresponding baseline value.
   */
  diffKey: keyof T;
}

/** metadata fields for table columns */
interface ColumnFormat<T> {
  /** key to fetch an element from the user provided data records */
  key: keyof T;

  /** title to show in the table header */
  title: string;

  /** alignment of the column */
  alignment?: Alignment;

  /** fixed width for the column */
  width?: number;
}

type AnyColumn<T> = Column<T> | DiffColumn<T>;

/** A group of typed columns */
export interface ColumnGroup<T> {
  groupTitle?: string;
  columns: AnyColumn<T>[];
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
 * Difference columns are added if baseline data is provided.
 *
 * Here's an example table:
 *
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
export function buildTable<T extends Record<string, any>>(
  groups: ColumnGroup<T>[],
  mainRecords: T[],
  baselineRecords?: T[],
  nameKey: keyof T = "name" as keyof T,
): string {
  let allRecords: T[];

  if (baselineRecords) {
    console.assert(baselineRecords.length === mainRecords.length);
    // Interleave main and baseline records
    allRecords = [];
    for (let i = 0; i < mainRecords.length; i++) {
      const main = mainRecords[i];
      const baseline = baselineRecords[i];

      const updatedMain = addComparisons(groups, main, baseline);
      allRecords.push(updatedMain);

      // Add baseline record with modified name
      const updatedBaseline = { ...baseline };
      (updatedBaseline as any)[nameKey] = `--> baseline`;
      allRecords.push(updatedBaseline);

      // Add blank row for separation (except for the last group)
      if (i < mainRecords.length - 1) {
        allRecords.push({} as T);
      }
    }
  } else {
    // No baseline data, use main records as-is (but filter out diff columns)
    const filteredGroups = groups.map(group => ({
      ...group,
      columns: group.columns.filter(col => !col.diffKey),
    }));
    return constructTable(filteredGroups, mainRecords);
  }

  return constructTable(groups, allRecords);
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

function sectionSpanning<T>(groups: ColumnGroup<T>[]): SpanningCellConfig[] {
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
    const dcol = col as DiffColumn<T>; // we know from filter above that diffKey is set
    const diffKey = dcol.diffKey;
    const mainValue = mainRecord[diffKey];
    const baselineValue = baselineRecord[diffKey];
    const diffFormat = dcol.diffFormatter ?? diffPercent;
    const diffStr = diffFormat(mainValue, baselineValue);
    (updatedMain as any)[col.key] = diffStr;
  }

  return updatedMain;
}

function constructTable<T extends Record<string, any>>(
  groups: ColumnGroup<T>[],
  records: T[],
): string {
  const { headerRows, config } = tableSetup(groups);
  const dataRows = recordsToRows(records, groups);
  const allRows = [...headerRows, ...dataRows];
  return table(allRows, config);
}

function tableSetup<T>(groups: ColumnGroup<T>[]): TableSetup {
  const titles = columnTitles(groups);
  const numColumns = titles.length;

  const sectionRows = groupHeaders(groups, numColumns);
  const headerRows = [...sectionRows, titles];

  const spanningCells = [...sectionSpanning(groups)];
  const config: TableUserConfig = { spanningCells, ...lineFunctions(groups) };

  return { headerRows, config };
}
