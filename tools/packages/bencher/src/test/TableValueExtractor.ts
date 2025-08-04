/** Extract numeric values from benchmark tables with Unicode borders. */

/** Extract a numeric value from a table by row name and column header. */
export function extractValue(
  table: string,
  row: string,
  column: string,
  group?: string,
): number | undefined {
  const lines = trimmedBody(table);
  const dataRow = lines.find(l => l.includes(row));
  if (!dataRow) return undefined;

  let colIndex: number | undefined;
  if (group) {
    colIndex = getGroupColumnIndex(lines, group, column);
  } else {
    const headerLine = lines.find(line => line.includes(column));
    colIndex = getColumnIndex(headerLine, column);
  }

  if (colIndex === undefined) return undefined;
  return parseCell(dataRow, colIndex);
}

/** @return the table lines w/borders and blank rows removed */
function trimmedBody(table: string): string[] {
  const tableSide = "║";
  const lines = table.split("\n");
  const bodyLines = lines.filter(line => line.includes(tableSide));
  const trimmedLines = bodyLines.map(line =>
    line.replaceAll(tableSide, "").trim(),
  );
  const noBlanks = trimmedLines.filter(line => !line.match(/^[\s│]+$/));
  return noBlanks;
}

/** Get the column index for a specific group and column combination. */
function getGroupColumnIndex(
  tableLines: string[],
  groupName: string,
  targetColumn: string,
): number | undefined {
  // assume the first line with the group or column name is the header lines
  const groupHeaderLine = tableLines.find(line => line.includes(groupName));
  const columnHeaderLine = tableLines.find(line => line.includes(targetColumn));
  if (!columnHeaderLine || !groupHeaderLine) return undefined;

  const groupHeaders = splitColumnGroups(groupHeaderLine);
  const groupedColumns = splitColumnGroups(columnHeaderLine);

  const groupIndex = groupHeaders.findIndex(col => col.includes(groupName));
  if (groupIndex === -1) return undefined;

  const columnsBefore = countColumnsBeforeGroup(groupedColumns, groupIndex);
  const columnHeaders = splitColumns(columnHeaderLine);
  const targetColumnIndex = columnHeaders.findIndex(
    (c, i) => c.includes(targetColumn) && i >= columnsBefore,
  );
  return targetColumnIndex;
}

/** Count total columns in groups before the target group index. */
function countColumnsBeforeGroup(
  columnHeaders: string[],
  targetGroupIndex: number,
): number {
  const columnsPerGroup = columnHeaders.map(col => splitColumns(col).length);
  const groupsBefore = columnsPerGroup.slice(0, targetGroupIndex);
  return groupsBefore.reduce((sum, cols) => sum + cols, 0);
}

function getColumnIndex(
  header: string | undefined,
  column: string,
): number | undefined {
  if (!header) return undefined;

  const columns = splitColumns(header);
  const index = columns.findIndex(col => col.includes(column));
  return index !== -1 ? index : undefined;
}

function parseCell(row: string, index: number): number | undefined {
  const columns = splitColumns(row);
  const text = columns[index];

  if (!text) return undefined;

  const match = text.match(/[\d,]+\.?\d*/);
  if (!match) return undefined;

  const value = Number.parseFloat(match[0].replace(/,/g, ""));
  return Number.isNaN(value) ? undefined : value;
}

/** split column groups along '│' borders */
function splitColumnGroups(line: string): string[] {
  return line.split("│").map(col => col.trim());
}

/** split data or title columns (ws or '│' borders)
 * 
 * NOTE: assumes that column titles don't have spaces in them!
 */
function splitColumns(line: string): string[] {
  return line
    .split(/[\s│]+/)
    .map(col => col.trim())
    .filter(Boolean);
}
