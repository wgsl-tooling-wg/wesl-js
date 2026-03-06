import { expect, test } from "vitest";
import type { RefIdent, StructMemberElem } from "wesl";
import { structLayout, typeLayout } from "../StructLayout.ts";

/** Helper to create a minimal StructMemberElem for testing. */
function member(name: string, typeName: string): StructMemberElem {
  return {
    kind: "member",
    start: 0,
    end: 0,
    contents: [],
    name: { kind: "name", name, start: 0, end: 0 },
    typeRef: {
      kind: "type",
      start: 0,
      end: 0,
      contents: [],
      name: { kind: "ref", originalName: typeName } as RefIdent,
    },
  };
}

test("scalar f32", () => {
  expect(typeLayout("f32")).toEqual({ alignment: 4, size: 4 });
});

test("scalar f16", () => {
  expect(typeLayout("f16")).toEqual({ alignment: 2, size: 2 });
});

test("vec2f", () => {
  expect(typeLayout("vec2f")).toEqual({ alignment: 8, size: 8 });
});

test("vec3f: align=16, size=12", () => {
  expect(typeLayout("vec3f")).toEqual({ alignment: 16, size: 12 });
});

test("vec4f", () => {
  expect(typeLayout("vec4f")).toEqual({ alignment: 16, size: 16 });
});

test("mat2x2f", () => {
  expect(typeLayout("mat2x2f")).toEqual({ alignment: 8, size: 16 });
});

test("mat4x4f", () => {
  expect(typeLayout("mat4x4f")).toEqual({ alignment: 16, size: 64 });
});

test("unknown type throws", () => {
  expect(() => typeLayout("MyStruct")).toThrow("unsupported type");
});

test("u32, vec2f: vec2f at offset 8", () => {
  const layout = structLayout([member("a", "u32"), member("b", "vec2f")]);
  expect(layout.fields[1].offset).toBe(8);
});

test("u32, vec3f: vec3f at offset 16", () => {
  const layout = structLayout([member("a", "u32"), member("b", "vec3f")]);
  expect(layout.fields[1].offset).toBe(16);
});

test("u32, vec4f: vec4f at offset 16", () => {
  const layout = structLayout([member("a", "u32"), member("b", "vec4f")]);
  expect(layout.fields[1].offset).toBe(16);
});

test("vec3f, u32: u32 at offset 12 (vec3 size=12, not 16)", () => {
  const layout = structLayout([member("a", "vec3f"), member("b", "u32")]);
  expect(layout.fields[1].offset).toBe(12);
});

test("f32, f32, f32: offsets 0, 4, 8", () => {
  const layout = structLayout([
    member("a", "f32"),
    member("b", "f32"),
    member("c", "f32"),
  ]);
  expect(layout.fields.map(f => f.offset)).toEqual([0, 4, 8]);
});

test("vec4f, f32: f32 at offset 16", () => {
  const layout = structLayout([member("a", "vec4f"), member("b", "f32")]);
  expect(layout.fields[1].offset).toBe(16);
});

test("mixed: f32, vec3f, f32 => offsets 0, 16, 28, bufferSize=32", () => {
  const layout = structLayout([
    member("a", "f32"),
    member("b", "vec3f"),
    member("c", "f32"),
  ]);
  expect(layout.fields.map(f => f.offset)).toEqual([0, 16, 28]);
  expect(layout.bufferSize).toBe(32);
});

test("f32, vec3f: bufferSize=32 (tail padding)", () => {
  const layout = structLayout([member("a", "f32"), member("b", "vec3f")]);
  // offset 16 + size 12 = 28, rounded to struct align 16 => 32
  expect(layout.bufferSize).toBe(32);
});

test("single f32: bufferSize=4", () => {
  const layout = structLayout([member("x", "f32")]);
  expect(layout.fields[0]).toEqual({ name: "x", offset: 0, size: 4 });
  expect(layout.bufferSize).toBe(4);
});

test("resolution + time + mouse layout (matches RenderUniforms)", () => {
  const layout = structLayout([
    member("resolution", "vec2f"),
    member("time", "f32"),
    member("mouse", "vec2f"),
  ]);
  expect(layout.fields.map(f => [f.name, f.offset])).toEqual([
    ["resolution", 0],
    ["time", 8],
    ["mouse", 16],
  ]);
  // struct align = max(8, 4, 8) = 8
  // total = 16 + 8 = 24, rounded to 8 => 24
  expect(layout.bufferSize).toBe(24);
});
