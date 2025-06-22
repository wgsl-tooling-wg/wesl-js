/** values for one row */
export type TableRow = Record<string, string>;

/** static width of each column */
interface ColumnWidths {
  [key: string]: number;
}

const columnPadding = 2;

/** 
 * Print a text table with a header row, aligned columns, 
 * and an optional set of static columns
 * 
 * column widths are calculated dynamically based on the longest value in each column
*/
export class TextTable {
  private staticColumns: string[];

  /** @param staticFields - optional list of fields to always include as columns */
  constructor(staticFields?: string[]) {
    this.staticColumns = staticFields || [];
  }

  /** @returns the tabular text report for the provided array of values */
  report(valueRows: TableRow[]): string {
    const columns = this.columnNames(valueRows);
    const widths = columnWidths(columns, valueRows);
    const headerRows = Object.fromEntries(columns.map(c => [c, c]));
    const jsonRows = [headerRows, ...valueRows];
    const stringRows = jsonRows.map(r => row(r, widths));
    return stringRows.join("\n");
  }

  private columnNames(values: TableRow[]): string[] {
    const set = new Set<string>();
    values.forEach(jsonRow => Object.keys(jsonRow).forEach(k => set.add(k)));
    this.staticColumns.forEach(k => set.add(k));
    return [...set];
  }
}

/** generate string for one row in the table */
function row(rowValues: TableRow, columnWidths: ColumnWidths): string {
  const rowStrings = Object.entries(columnWidths).map(([name, width]) => {
    const value = rowValues[name] || "";
    return value.slice(0, width).padStart(width, " ");
  });
  return rowStrings.join(" ");
}

/** calculate column widths dynamically */
function columnWidths(columnNames: string[], values: TableRow[]): ColumnWidths {
  const entries = columnNames.map(name => {
    const valueLength = longestColumnValue(values, name);
    const maxWidth = Math.max(name.length, valueLength);
    return [name, maxWidth + columnPadding];
  });
  return Object.fromEntries(entries);
}

/** return the length of the longest value in a named column  */
function longestColumnValue(rows: TableRow[], name: string): number {
  const column = rows.map(v => v[name]);
  const widths = column.map(v => (v ? v.length : 0));
  const longest = widths.reduce((a, b) => (a > b ? a : b));
  return longest;
}
