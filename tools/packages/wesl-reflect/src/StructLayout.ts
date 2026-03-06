import type { StructMemberElem } from "wesl";
import { findAnnotation, numericParams } from "./Annotations.ts";
import { originalTypeName } from "./WeslStructs.ts";

export interface FieldLayout {
  name: string;
  offset: number;
  size: number;
}

export interface StructLayout {
  fields: FieldLayout[];
  bufferSize: number;
}

interface TypeInfo {
  alignment: number;
  size: number;
}

const roundUp = (align: number, n: number): number =>
  Math.ceil(n / align) * align;

const typeTable: Record<string, TypeInfo> = {
  // scalars
  f32: scalar(4),
  i32: scalar(4),
  u32: scalar(4),
  f16: scalar(2),

  // vec<N, f32> shorthand
  vec2f: vec(2, 4),
  vec3f: vec(3, 4),
  vec4f: vec(4, 4),

  // vec<N, i32>
  vec2i: vec(2, 4),
  vec3i: vec(3, 4),
  vec4i: vec(4, 4),

  // vec<N, u32>
  vec2u: vec(2, 4),
  vec3u: vec(3, 4),
  vec4u: vec(4, 4),

  // vec<N, f16>
  vec2h: vec(2, 2),
  vec3h: vec(3, 2),
  vec4h: vec(4, 2),

  // mat<C>x<R>f (f32)
  mat2x2f: mat(2, 2, 4),
  mat3x2f: mat(3, 2, 4),
  mat4x2f: mat(4, 2, 4),
  mat2x3f: mat(2, 3, 4),
  mat3x3f: mat(3, 3, 4),
  mat4x3f: mat(4, 3, 4),
  mat2x4f: mat(2, 4, 4),
  mat3x4f: mat(3, 4, 4),
  mat4x4f: mat(4, 4, 4),

  // mat<C>x<R>h (f16)
  mat2x2h: mat(2, 2, 2),
  mat3x2h: mat(3, 2, 2),
  mat4x2h: mat(4, 2, 2),
  mat2x3h: mat(2, 3, 2),
  mat3x3h: mat(3, 3, 2),
  mat4x3h: mat(4, 3, 2),
  mat2x4h: mat(2, 4, 2),
  mat3x4h: mat(3, 4, 2),
  mat4x4h: mat(4, 4, 2),
};

/** Compute byte offsets and buffer size for a flat WGSL struct. */
export function structLayout(members: StructMemberElem[]): StructLayout {
  let offset = 0;
  let structAlign = 1;
  const fields: FieldLayout[] = [];

  for (const m of members) {
    let { alignment, size } = typeLayout(originalTypeName(m.typeRef));

    const alignAttr = findAnnotation(m, "align");
    if (alignAttr) {
      const [n] = numericParams(alignAttr);
      if (n) alignment = Math.max(n, alignment);
    }

    const sizeAttr = findAnnotation(m, "size");
    if (sizeAttr) {
      const [n] = numericParams(sizeAttr);
      if (n) size = n;
    }

    structAlign = Math.max(structAlign, alignment);
    offset = roundUp(alignment, offset);
    fields.push({ name: m.name.name, offset, size });
    offset += size;
  }

  return { fields, bufferSize: roundUp(structAlign, offset) };
}

/** Look up alignment and size for a host-shareable WGSL type. */
export function typeLayout(typeName: string): TypeInfo {
  const info = typeTable[typeName];
  if (info) return info;
  throw new Error(`unsupported type for layout: '${typeName}'`);
}

function scalar(size: number): TypeInfo {
  return { alignment: size, size };
}

// vec2: align=2*S, size=2*S; vec3: align=4*S, size=3*S; vec4: align=4*S, size=4*S
function vec(n: number, scalarSize: number): TypeInfo {
  const alignN = n === 3 ? 4 : n;
  return { alignment: alignN * scalarSize, size: n * scalarSize };
}

// matCxR<T>: C columns of vecR<T>, column stride = roundUp(colAlign, colSize)
function mat(cols: number, rows: number, scalarSize: number): TypeInfo {
  const col = vec(rows, scalarSize);
  const colStride = roundUp(col.alignment, col.size);
  return { alignment: col.alignment, size: cols * colStride };
}
