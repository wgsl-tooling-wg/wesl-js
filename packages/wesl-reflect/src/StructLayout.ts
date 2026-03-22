import type {
  Conditions,
  ExpressionElem,
  RefIdent,
  StructElem,
  StructMemberElem,
  TypeRefElem,
} from "wesl";
import { filterValidElements } from "wesl";
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
  alignment: number;
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

/** Compute byte offsets and buffer size for a bound WGSL struct.
 *  Nested structs resolved via refersTo links. Conditional members filtered when conditions provided. */
export function structLayout(
  struct: StructElem,
  conditions?: Conditions,
): StructLayout {
  const members = conditions
    ? filterValidElements(struct.members, conditions)
    : struct.members;
  return membersLayout(members, conditions);
}

/** Compute layout from a flat member list (used internally and for nested resolution). */
function membersLayout(
  members: StructMemberElem[],
  conditions?: Conditions,
): StructLayout {
  let offset = 0;
  let structAlign = 1;
  const fields: FieldLayout[] = [];

  for (const m of members) {
    let { alignment, size } = memberTypeInfo(m.typeRef, conditions);

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

  const bufferSize = roundUp(structAlign, offset);
  return { fields, bufferSize, alignment: structAlign };
}

/** Resolve alignment and size for a member's type (primitive, array, or nested struct). */
function memberTypeInfo(
  typeRef: TypeRefElem,
  conditions?: Conditions,
): TypeInfo {
  const name = originalTypeName(typeRef);

  // primitive type
  const primitive = typeTable[name];
  if (primitive) return primitive;

  // array<T, N> or array<T>
  if (name === "array") {
    const params = typeRef.templateParams;
    if (!params?.length)
      throw new Error("array type missing template parameters");
    const elem = elemTypeInfo(params[0], conditions);
    const stride = roundUp(elem.alignment, elem.size);
    const p = params[1];
    const count = p && "value" in p ? Number(p.value) : 0;
    return { alignment: elem.alignment, size: count * stride };
  }

  // nested struct via refersTo
  const nested = resolveStructInfo(typeRef.name, conditions);
  if (nested) return nested;

  throw new Error(`unsupported type for layout: '${name}'`);
}

/** Extract type info from an array template param (TypeRefElem or RefIdentElem). */
function elemTypeInfo(
  param: ExpressionElem,
  conditions?: Conditions,
): TypeInfo {
  if (param.kind === "type") return memberTypeInfo(param, conditions);
  // RefIdentElem (kind "ref") - has .ident which is a RefIdent
  const p = param as Record<string, any>;
  const ident: RefIdent | undefined = p.ident;
  const typeName = ident?.originalName ?? p.originalName;
  if (!typeName) throw new Error("cannot resolve array element type");
  const primitive = typeTable[typeName];
  if (primitive) return primitive;
  if (ident) {
    const nested = resolveStructInfo(ident, conditions);
    if (nested) return nested;
  }
  throw new Error(`unsupported type for layout: '${typeName}'`);
}

/** Follow refersTo links to resolve a RefIdent to a struct and compute its layout. */
function resolveStructInfo(
  ident: RefIdent,
  conditions?: Conditions,
): TypeInfo | undefined {
  const decl = ident.refersTo;
  if (decl?.kind !== "decl") return undefined;
  const elem = decl.declElem;
  if (elem?.kind !== "struct") return undefined;
  const inner = structLayout(elem, conditions);
  return { alignment: inner.alignment, size: inner.bufferSize };
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
