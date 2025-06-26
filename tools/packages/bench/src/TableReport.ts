import pico from "picocolors";
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

/**
 * A group of columns.
 *
 * If any ColumnGroup has a groupTitle, tableSetup() will insert a row for titles.
 *
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
