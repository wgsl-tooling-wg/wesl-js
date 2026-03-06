import type { StructElem, StructMemberElem } from "wesl";
import { structLayout, type TypeResolver } from "./StructLayout.ts";
import {
  type AutoAnnotation,
  autoAnnotation,
  type ColorAnnotation,
  colorAnnotation,
  type RangeAnnotation,
  rangeAnnotation,
  type ToggleAnnotation,
  toggleAnnotation,
} from "./UniformAnnotations.ts";
import { originalTypeName } from "./WeslStructs.ts";

export interface RangeControl extends FieldBase, RangeAnnotation {
  kind: "range";
}
export interface ColorControl extends FieldBase, ColorAnnotation {
  kind: "color";
}
export interface ToggleControl extends FieldBase, ToggleAnnotation {
  kind: "toggle";
}

export type UniformControl = RangeControl | ColorControl | ToggleControl;

export interface AutoField extends FieldBase, AutoAnnotation {
  kind: "auto";
}
export interface PlainField extends FieldBase {
  kind: "plain";
}

export type UniformField = AutoField | PlainField;

/** Layout of a @uniforms struct: UI controls for annotated members, data fields for the rest. */
export interface UniformsLayout {
  structName: string;
  bufferSize: number;
  controls: UniformControl[];
  fields: UniformField[];
}

interface FieldBase {
  name: string;
  offset: number;
  size: number;
  type: string;
}

type Classified =
  | { control: UniformControl; field?: undefined }
  | { control?: undefined; field: UniformField };

/** Compute layout + annotations for a @uniforms-annotated struct. */
export function uniformsLayout(
  struct: StructElem,
  resolve?: TypeResolver,
): UniformsLayout {
  const layout = structLayout(struct.members, resolve);
  const controls: UniformControl[] = [];
  const fields: UniformField[] = [];

  for (let i = 0; i < struct.members.length; i++) {
    const m = struct.members[i];
    const fl = layout.fields[i];
    const type = originalTypeName(m.typeRef);
    const base = { name: fl.name, offset: fl.offset, size: fl.size, type };
    const { control, field } = classifyMember(m, base);
    if (control) controls.push(control);
    else fields.push(field);
  }

  const structName = struct.name.ident.originalName;
  return { structName, bufferSize: layout.bufferSize, controls, fields };
}

/** Classify a struct member as a UI control or a data field based on annotations. */
function classifyMember(m: StructMemberElem, base: FieldBase): Classified {
  const range = rangeAnnotation(m);
  if (range) return { control: { kind: "range", ...base, ...range } };
  const color = colorAnnotation(m);
  if (color) return { control: { kind: "color", ...base, ...color } };
  const toggle = toggleAnnotation(m);
  if (toggle) return { control: { kind: "toggle", ...base, ...toggle } };
  const auto = autoAnnotation(m);
  if (auto) return { field: { kind: "auto", ...base, ...auto } };
  return { field: { kind: "plain", ...base } };
}
