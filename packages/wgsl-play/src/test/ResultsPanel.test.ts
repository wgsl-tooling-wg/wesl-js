import { expect, test } from "vitest";
import { parseSrcModule, type WeslAST } from "wesl";
import { TypeShapeError, varReflection } from "wesl-reflect";
import { type BufferEntry, tableData } from "../ResultsPanel.ts";

function parse(src: string): WeslAST {
  return parseSrcModule({
    modulePath: "test",
    debugFilePath: "test.wesl",
    src,
  });
}

function entry(src: string, varName: string, data: ArrayBuffer): BufferEntry {
  return { reflection: varReflection(parse(src), varName), data };
}

function f32Buffer(values: number[]): ArrayBuffer {
  return new Float32Array(values).buffer;
}
function i32Buffer(values: number[]): ArrayBuffer {
  return new Int32Array(values).buffer;
}
function u32Buffer(values: number[]): ArrayBuffer {
  return new Uint32Array(values).buffer;
}

test("scalar f32 array - 'squares' canonical", () => {
  const td = tableData(
    entry(
      `@buffer var<storage, read_write> result: array<f32, 4>;`,
      "result",
      f32Buffer([0, 1, 4, 9]),
    ),
  );
  expect(td.caption).toBe("result: array<f32, 4>");
  expect(td.headers).toEqual(["", "value"]);
  expect(td.rows).toEqual([
    ["0", "0.0"],
    ["1", "1.0"],
    ["2", "4.0"],
    ["3", "9.0"],
  ]);
});

test("u32 scalar values", () => {
  const td = tableData(
    entry(
      `@buffer var<storage, read_write> r: array<u32, 3>;`,
      "r",
      u32Buffer([1, 2, 3]),
    ),
  );
  expect(td.rows).toEqual([
    ["0", "1"],
    ["1", "2"],
    ["2", "3"],
  ]);
});

test("i32 negative values", () => {
  const td = tableData(
    entry(
      `@buffer var<storage, read_write> r: array<i32, 2>;`,
      "r",
      i32Buffer([-7, 42]),
    ),
  );
  expect(td.rows).toEqual([
    ["0", "-7"],
    ["1", "42"],
  ]);
});

test("vec2f formats as (a, b)", () => {
  const td = tableData(
    entry(
      `@buffer var<storage, read_write> v: array<vec2f, 2>;`,
      "v",
      f32Buffer([1, 2, 3, 4]),
    ),
  );
  expect(td.rows).toEqual([
    ["0", "(1.0, 2.0)"],
    ["1", "(3.0, 4.0)"],
  ]);
});

test("struct with two vec2f fields (Particle)", () => {
  const td = tableData(
    entry(
      `
        struct Particle { pos: vec2f, vel: vec2f }
        @buffer var<storage, read_write> p: array<Particle, 2>;
      `,
      "p",
      f32Buffer([0, 0, 0.1, 0, 1, 2, 0.1, 0]),
    ),
  );
  expect(td.headers).toEqual(["", "pos", "vel"]);
  expect(td.rows).toEqual([
    ["0", "(0.0, 0.0)", "(0.1, 0.0)"],
    ["1", "(1.0, 2.0)", "(0.1, 0.0)"],
  ]);
});

test("single (non-array) scalar", () => {
  const td = tableData(
    entry(`@buffer var<storage, read_write> x: f32;`, "x", f32Buffer([1.5])),
  );
  expect(td.caption).toBe("x: f32");
  expect(td.rows).toEqual([["0", "1.5"]]);
});

test("truncates beyond 256 rows and reports total", () => {
  const N = 300;
  const td = tableData(
    entry(
      `@buffer var<storage, read_write> big: array<u32, ${N}>;`,
      "big",
      u32Buffer(Array.from({ length: N }, (_, i) => i)),
    ),
  );
  expect(td.rows).toHaveLength(256);
  expect(td.truncated).toEqual({ totalRows: N });
});

test("f32 formatting: 4 sig figs for non-integers", () => {
  const td = tableData(
    entry(
      `@buffer var<storage, read_write> f: array<f32, 3>;`,
      "f",
      f32Buffer([Math.PI, 1234.5678, 0.000123]),
    ),
  );
  expect(td.rows[0][1]).toBe("3.142");
  expect(td.rows[1][1]).toBe("1235");
  expect(td.rows[2][1]).toBe("0.000123");
});

test("matrix element rejected as not table-renderable", () => {
  expect(() =>
    tableData(
      entry(
        `@buffer var<storage, read_write> m: array<mat4x4f, 1>;`,
        "m",
        new ArrayBuffer(64),
      ),
    ),
  ).toThrow(TypeShapeError);
});

test("runtime-sized array rejected at render time", () => {
  expect(() =>
    tableData(
      entry(
        `@buffer var<storage, read_write> r: array<f32>;`,
        "r",
        f32Buffer([1, 2, 3]),
      ),
    ),
  ).toThrow(/runtime-sized arrays/);
});
