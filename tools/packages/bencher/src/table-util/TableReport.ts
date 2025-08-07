import pico from "picocolors";
import type { Alignment, SpanningCellConfig, TableUserConfig } from "table";
import { table } from "table";
import { diffPercent } from "./Formatters.ts";

// Disable colors in tests to avoid ANSI escape codes in test output
const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const { bold } = isTest ? { bold: (str: string) => str } : pico;

/** Group of related columns in a table */
export interface ColumnGroup<T> {
  groupTitle?: string;
  columns: AnyColumn<T>[];
}

export type AnyColumn<T> = Column<T> | DiffColumn<T>;

/** Column definition with optional formatter */
export interface Column<T> extends ColumnFormat<T> {
  formatter?: (value: unknown) => string | null;
  diffKey?: undefined;
}

/** Column that compares values against a baseline */
interface DiffColumn<T> extends ColumnFormat<T> {
  diffFormatter?: (value: unknown, baseline: unknown) => string | null;
  formatter?: undefined;

  /** if set, this column holds a synthesized comparison value
   * comparing the value in selected by the diffKey against the
   * corresponding baseline value.
   */
  diffKey: keyof T;
}

/** Column formatting configuration */
interface ColumnFormat<T> {
  /** Data field to display */
  key: keyof T;

  /** Header text */
  title: string;

  alignment?: Alignment;

  width?: number;
}

/** Table headers and configuration for the table library */
export interface TableSetup {
  headerRows: string[][];
  config: TableUserConfig;
}

/** Data rows with optional baseline for comparison */
export interface ResultGroup<T extends Record<string, any>> {
  results: T[];

  baseline?: T;
}

/** Build a formatted table with column groups and optional baseline comparisons */
export function buildTable<T extends Record<string, any>>(
  columnGroups: ColumnGroup<T>[],
  resultGroups: ResultGroup<T>[],
  nameKey: keyof T = "name" as keyof T,
): string {
  const allRecords = flattenGroups(columnGroups, resultGroups, nameKey);
  return createTable(columnGroups, allRecords);
}

/** Convert column definitions and records into a formatted table string */
function createTable<T extends Record<string, any>>(
  groups: ColumnGroup<T>[],
  records: T[],
): string {
  const { headerRows, config } = setup(groups);
  const dataRows = toRows(records, groups);
  const allRows = [...headerRows, ...dataRows];
  return table(allRows, config);
}

/** Create group header rows with titles and spacing */
function createGroupHeaders<T>(
  groups: ColumnGroup<T>[],
  numColumns: number,
): string[][] {
  const hasHeader = groups.find(g => g.groupTitle);
  if (!hasHeader) return [];

  const sectionRow: string[] = [];
  for (const g of groups) {
    if (g.groupTitle) {
      const coloredTitle = bold(g.groupTitle);
      const section = padWithBlanks([coloredTitle], g.columns.length);
      sectionRow.push(...section);
    } else {
      sectionRow.push(...padWithBlanks([], g.columns.length));
    }
  }
  const blankRow = padWithBlanks([], numColumns);
  return [sectionRow, blankRow];
}

interface Lines {
  drawHorizontalLine: (index: number, size: number) => boolean;
  drawVerticalLine: (index: number, size: number) => boolean;
}

function createLines<T>(groups: ColumnGroup<T>[]): Lines {
  const { sectionBorders, headerBottom } = calcBorders(groups);

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

function createSectionSpans<T>(groups: ColumnGroup<T>[]): SpanningCellConfig[] {
  let col = 0;
  const row = 0;
  const alignment: Alignment = "center";

  const spans = groups.map(g => {
    const colSpan = g.columns.length;
    const cellConfig = { row, col, colSpan, alignment };
    col += colSpan;
    return cellConfig;
  });
  return spans;
}

function getTitles<T>(groups: ColumnGroup<T>[]): string[] {
  return groups.flatMap(g => g.columns.map(c => bold(c.title || " ")));
}

function padWithBlanks(arr: string[], length: number): string[] {
  if (arr.length >= length) return arr;
  return [...arr, ...Array(length - arr.length).fill(" ")];
}

/** Convert records to string arrays for the table library */
export function toRows<T extends Record<string, any>>(
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

/** Add comparison values to records that have diff columns */
function addComparisons<T extends Record<string, any>>(
  groups: ColumnGroup<T>[],
  mainRecord: T,
  baselineRecord: T,
): T {
  const diffColumns = groups.flatMap(g => g.columns).filter(col => col.diffKey);
  const updatedMain = { ...mainRecord };

  for (const col of diffColumns) {
    const dcol = col as DiffColumn<T>;
    const diffKey = dcol.diffKey;
    const mainValue = mainRecord[diffKey];
    const baselineValue = baselineRecord[diffKey];
    const diffFormat = dcol.diffFormatter ?? diffPercent;
    const diffStr = diffFormat(mainValue, baselineValue);
    (updatedMain as any)[col.key] = diffStr;
  }

  return updatedMain;
}

/** Flatten result groups and add spacing between groups */
function flattenGroups<T extends Record<string, any>>(
  columnGroups: ColumnGroup<T>[],
  resultGroups: ResultGroup<T>[],
  nameKey: keyof T,
): T[] {
  return resultGroups.flatMap((group, i) => {
    const groupRecords = addBaseline(columnGroups, group, nameKey);

    const isLast = i === resultGroups.length - 1;
    return isLast ? groupRecords : [...groupRecords, {} as T];
  });
}

/** Process results with baseline comparisons if available */
function addBaseline<T extends Record<string, any>>(
  columnGroups: ColumnGroup<T>[],
  group: ResultGroup<T>,
  nameKey: keyof T,
): T[] {
  const { results, baseline } = group;

  if (!baseline) return results;

  const diffResults = results.map(result =>
    addComparisons(columnGroups, result, baseline),
  );

  const markedBaseline = {
    ...baseline,
    [nameKey]: `--> ${baseline[nameKey]}`,
  };

  return [...diffResults, markedBaseline];
}

/** Calculate vertical lines between sections and header bottom position */
function calcBorders<T>(groups: ColumnGroup<T>[]): {
  sectionBorders: number[];
  headerBottom: number;
} {
  const sectionBorders: number[] = [];
  const titles = groups.map(g => g.groupTitle);
  let headerBottom = 1;

  if (titles.length > 0) {
    headerBottom = 3;

    let border = 0;
    for (const g of groups) {
      border += g.columns.length;
      sectionBorders.push(border);
    }
  }

  return { sectionBorders, headerBottom };
}

/** Create table headers and configuration */
function setup<T>(groups: ColumnGroup<T>[]): TableSetup {
  const titles = getTitles(groups);
  const numColumns = titles.length;

  const sectionRows = createGroupHeaders(groups, numColumns);
  const headerRows = [...sectionRows, titles];

  const spanningCells = [...createSectionSpans(groups)];
  const config: TableUserConfig = { spanningCells, ...createLines(groups) };

  return { headerRows, config };
}
