import type {
  Alignment,
  ColumnUserConfig,
  SpanningCellConfig,
  TableUserConfig,
} from "table";
import pico from "picocolors";

const { bold, red, green } = pico;

export interface Column {
  alignment?: Alignment;
  title?: string;
}

export interface ColumnGroup {
  groupTitle?: string;
  columns: Column[];
}

export interface TableSetup {
  headerRows: string[][];
  config: TableUserConfig;
}

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

/** @return spanning cells to configure for the main columns */
function columnAlign(groups: ColumnGroup[], row = 0): ColumnUserConfig[] {
  const columns = groups.flatMap(g => g.columns);
  const colSpan = 1;
  return columns.map((c, col) => {
    return { row, col, colSpan, alignment: c.alignment };
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

export function prettyInteger(x: number | undefined): string | null {
  if (x === undefined) return null;
  return new Intl.NumberFormat("en-US").format(Math.round(x));
}

export function prettyFloat(
  x: number | undefined,
  digits: number,
): string | null {
  if (x === undefined) return null;
  return x.toFixed(digits).replace(/\.?0+$/, "");
}
