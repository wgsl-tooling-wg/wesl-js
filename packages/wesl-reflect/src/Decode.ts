import {
  type ArrayShape,
  type MatShape,
  type ScalarKind,
  type StructShape,
  scalarSize,
  type TypeShape,
  type VecShape,
} from "./TypeShape.ts";

/** Decoded buffer value: a scalar, vec/mat as a tuple, array of values, or struct as an object. */
export type DecodedValue =
  | number
  | boolean
  | DecodedValue[]
  | { [field: string]: DecodedValue };

/** Decode bytes into JS values using `shape` as the type tree.
 *  For runtime-sized arrays, the element count is derived from the buffer size. */
export function decodeBuffer(
  shape: TypeShape,
  buffer: ArrayBuffer | DataView,
  offset = 0,
): DecodedValue {
  const view = buffer instanceof DataView ? buffer : new DataView(buffer);
  return decode(shape, view, offset);
}

function decode(
  shape: TypeShape,
  view: DataView,
  offset: number,
): DecodedValue {
  switch (shape.kind) {
    case "scalar":
      return readScalar(shape.type, view, offset);
    case "atomic":
      return readScalar(shape.component, view, offset);
    case "vec":
      return decodeVec(shape, view, offset);
    case "mat":
      return decodeMat(shape, view, offset);
    case "array":
      return decodeArray(shape, view, offset);
    case "struct":
      return decodeStruct(shape, view, offset);
  }
}

function readScalar(
  kind: ScalarKind,
  view: DataView,
  offset: number,
): number | boolean {
  if (kind === "f32") return view.getFloat32(offset, true);
  if (kind === "f16") return getFloat16(view, offset);
  if (kind === "i32") return view.getInt32(offset, true);
  if (kind === "u32") return view.getUint32(offset, true);
  return view.getUint32(offset, true) !== 0;
}

/** Pre-allocated `Array.from({length: n}, fn)` — faster and avoids the {length} idiom. */
function mapN<T>(n: number, fn: (i: number) => T): T[] {
  const result = new Array<T>(n);
  for (let i = 0; i < n; i++) result[i] = fn(i);
  return result;
}

function decodeVec(shape: VecShape, view: DataView, offset: number): number[] {
  const scalarBytes = scalarSize(shape.component);
  return mapN(
    shape.n,
    i => readScalar(shape.component, view, offset + i * scalarBytes) as number,
  );
}

function decodeMat(
  shape: MatShape,
  view: DataView,
  offset: number,
): number[][] {
  // MatShape size encodes cols * colStride, so colStride = size / cols.
  const colStride = shape.size / shape.cols;
  return mapN(shape.cols, c =>
    decodeMatColumn(shape, view, offset + c * colStride),
  );
}

function decodeMatColumn(
  shape: MatShape,
  view: DataView,
  offset: number,
): number[] {
  const scalarBytes = scalarSize(shape.component);
  return mapN(
    shape.rows,
    r => readScalar(shape.component, view, offset + r * scalarBytes) as number,
  );
}

function decodeArray(
  shape: ArrayShape,
  view: DataView,
  offset: number,
): DecodedValue[] {
  const count =
    shape.length === "runtime"
      ? Math.floor((view.byteLength - offset) / shape.stride)
      : shape.length;
  return mapN(count, i => decode(shape.elem, view, offset + i * shape.stride));
}

function decodeStruct(
  shape: StructShape,
  view: DataView,
  offset: number,
): { [field: string]: DecodedValue } {
  return Object.fromEntries(
    shape.fields.map(f => [f.name, decode(f.type, view, offset + f.offset)]),
  );
}

/** Polyfill DataView.getFloat16 (Stage-4 proposal, available in modern browsers). */
function getFloat16(view: DataView, offset: number): number {
  const dvAny = view as DataView & {
    getFloat16?: (o: number, le: boolean) => number;
  };
  if (typeof dvAny.getFloat16 === "function")
    return dvAny.getFloat16(offset, true);
  const bits = view.getUint16(offset, true);
  const sign = (bits >> 15) & 1;
  const exp = (bits >> 10) & 0x1f;
  const frac = bits & 0x3ff;
  if (exp === 0) {
    const v = (frac / 1024) * 2 ** -14;
    return sign ? -v : v;
  }
  if (exp === 0x1f) {
    if (frac) return Number.NaN;
    return sign ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  }
  const v = (1 + frac / 1024) * 2 ** (exp - 15);
  return sign ? -v : v;
}
