import {
  type ScalarKind,
  type TypeShape,
  TypeShapeError,
  type VarReflection,
} from "wesl-reflect";

export interface BufferEntry {
  reflection: VarReflection;
  data: ArrayBuffer;
}

export interface RenderPanelParams {
  panel: HTMLElement;
  entries: BufferEntry[];
}

/** Pre-rendered table data, used by both the DOM renderer and unit tests. */
export interface TableData {
  caption: string;
  headers: string[];
  rows: string[][];
  /** Rows beyond `truncationLimit` (only the first `truncationLimit` are in `rows`). */
  truncated?: { totalRows: number };
}

interface RowShape {
  /** Per-row type: array element type, or the var's type when not an array. */
  row: TypeShape;
  rowCount: number;
  stride: number;
}

const truncationLimit = 256;

/** Render compute-mode @buffer readbacks as one HTML table per buffer. */
export function renderResultsPanel(p: RenderPanelParams): void {
  p.panel.replaceChildren(...p.entries.map(renderTable));
}

/** Build the structured table data for a single @buffer entry. Pure (no DOM). */
export function tableData(entry: BufferEntry): TableData {
  const { reflection, data } = entry;
  const { row, rowCount, stride } = rowShape(reflection);
  const visibleRows = Math.min(rowCount, truncationLimit);
  const view = new DataView(data);

  const caption = `${reflection.varName}: ${shapeLabel(reflection.type)}`;
  const headers =
    row.kind === "struct"
      ? ["", ...row.fields.map(f => f.name)]
      : ["", "value"];

  const rows = buildRows(view, row, visibleRows, stride);
  const td: TableData = { caption, headers, rows };
  if (rowCount > truncationLimit) td.truncated = { totalRows: rowCount };
  return td;
}

function renderTable(entry: BufferEntry): HTMLElement {
  const td = tableData(entry);
  const section = document.createElement("section");
  section.className = "result";
  section.appendChild(makeCaption(td.caption));
  const table = document.createElement("table");
  table.appendChild(makeHeader(td.headers));
  table.appendChild(makeBody(td.rows));
  if (td.truncated) {
    table.appendChild(makeShowAllFooter(table, entry, td.truncated.totalRows));
  }
  section.appendChild(table);
  return section;
}

/** Resolve the per-row shape and stride for tabular display.
 *  Throws TypeShapeError if the buffer's type isn't supported as a table cell. */
function rowShape(reflection: VarReflection): RowShape {
  const t = reflection.type;
  if (t.kind === "array") {
    if (t.length === "runtime") {
      throw new TypeShapeError(
        `runtime-sized arrays are not supported in the compute results table`,
        reflection.varName,
      );
    }
    assertRenderable(t.elem, reflection.varName);
    return { row: t.elem, rowCount: t.length, stride: t.stride };
  }
  assertRenderable(t, reflection.varName);
  return { row: t, rowCount: 1, stride: t.size };
}

function shapeLabel(t: TypeShape): string {
  if (t.kind === "array") {
    const len = t.length === "runtime" ? "" : `, ${t.length}`;
    return `array<${typeLabel(t.elem)}${len}>`;
  }
  return typeLabel(t);
}

/** Materialize `count` row-cell arrays at successive `stride` offsets. */
function buildRows(
  view: DataView,
  row: TypeShape,
  count: number,
  stride: number,
): string[][] {
  return Array.from({ length: count }, (_, i) =>
    rowCells(view, row, i, i * stride),
  );
}

function makeCaption(text: string): HTMLElement {
  const caption = document.createElement("div");
  caption.className = "result-caption";
  caption.textContent = text;
  return caption;
}

function makeHeader(headers: string[]): HTMLElement {
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  for (const h of headers) {
    const th = document.createElement("th");
    th.textContent = h;
    tr.appendChild(th);
  }
  thead.appendChild(tr);
  return thead;
}

function makeBody(rows: string[][]): HTMLElement {
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const cell of row) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  return tbody;
}

function makeShowAllFooter(
  table: HTMLTableElement,
  entry: BufferEntry,
  totalRows: number,
): HTMLElement {
  const tfoot = document.createElement("tfoot");
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  const { row, stride } = rowShape(entry.reflection);
  td.colSpan = row.kind === "struct" ? row.fields.length + 1 : 2;
  const button = document.createElement("button");
  button.textContent = `Show all ${totalRows} rows`;
  button.addEventListener("click", () => {
    const view = new DataView(entry.data);
    const allRows = buildRows(view, row, totalRows, stride);
    table.replaceChild(makeBody(allRows), table.tBodies[0]);
    tfoot.remove();
  });
  td.appendChild(
    document.createTextNode(
      `Showing first ${truncationLimit} of ${totalRows} rows. `,
    ),
  );
  td.appendChild(button);
  tr.appendChild(td);
  tfoot.appendChild(tr);
  return tfoot;
}

/** WgslPlay's compute-results table only renders f32/i32/u32 scalars, vectors of those, or structs of those. */
function assertRenderable(t: TypeShape, varName: string): void {
  if (t.kind === "scalar") {
    if (t.type === "f16") throw notRenderable("f16", varName);
    return;
  }
  if (t.kind === "vec") {
    if (t.component === "f16") throw notRenderable("vec<f16>", varName);
    return;
  }
  if (t.kind === "struct") {
    for (const f of t.fields) assertRenderable(f.type, varName);
    return;
  }
  if (t.kind === "mat") {
    throw new TypeShapeError(
      `matrices are not supported in the compute results table; use vecN<f32> instead`,
      varName,
    );
  }
  if (t.kind === "atomic") {
    throw new TypeShapeError(
      `atomic types are not supported in the compute results table`,
      varName,
    );
  }
  throw new TypeShapeError(`unsupported element type for table`, varName);
}

function typeLabel(t: TypeShape): string {
  if (t.kind === "scalar") return t.type;
  if (t.kind === "vec") return `vec${t.n}<${t.component}>`;
  if (t.kind === "mat") return `mat${t.cols}x${t.rows}<${t.component}>`;
  if (t.kind === "atomic") return `atomic<${t.component}>`;
  if (t.kind === "struct") return t.name;
  const len = t.length === "runtime" ? "" : `, ${t.length}`;
  return `array<${typeLabel(t.elem)}${len}>`;
}

function rowCells(
  view: DataView,
  row: TypeShape,
  rowIndex: number,
  baseOffset: number,
): string[] {
  if (row.kind === "struct") {
    return [
      String(rowIndex),
      ...row.fields.map(f => formatElem(view, f.type, baseOffset + f.offset)),
    ];
  }
  return [String(rowIndex), formatElem(view, row, baseOffset)];
}

function notRenderable(typeName: string, varName: string): TypeShapeError {
  return new TypeShapeError(
    `${typeName} is not supported in the compute results table`,
    varName,
  );
}

function formatElem(view: DataView, elem: TypeShape, offset: number): string {
  if (elem.kind === "scalar") return formatScalar(view, elem.type, offset);
  if (elem.kind === "vec") {
    const joined = Array.from({ length: elem.n }, (_, i) =>
      formatScalar(view, elem.component, offset + i * 4),
    ).join(", ");
    return `(${joined})`;
  }
  return `<${elem.kind}>`;
}

function formatScalar(
  view: DataView,
  type: ScalarKind,
  offset: number,
): string {
  if (type === "f32") return formatF32(view.getFloat32(offset, true));
  if (type === "i32") return String(view.getInt32(offset, true));
  if (type === "u32") return String(view.getUint32(offset, true));
  if (type === "bool")
    return view.getUint32(offset, true) !== 0 ? "true" : "false";
  return "<f16>";
}

function formatF32(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Number.isInteger(v)) return v.toFixed(1);
  return Number.parseFloat(v.toPrecision(4)).toString();
}
