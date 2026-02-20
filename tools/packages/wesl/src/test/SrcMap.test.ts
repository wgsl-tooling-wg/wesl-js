import { expect, test } from "vitest";
import { SrcMap, type SrcMapEntry, type SrcWithPath } from "../SrcMap.ts";

const src: SrcWithPath = {
  text: "let x = lygia::math::consts::PI;\n  let x = 7;",
  path: "test.wesl",
};

function makeMap(entries: SrcMapEntry[]): SrcMap {
  const dest: SrcWithPath = { text: "PI;\n  let x = 7;" };
  return new SrcMap(dest, entries);
}

test("compact does not merge entries with different src/dest lengths", () => {
  // Entry A: src "lygia::math::consts::PI" (25 chars) -> dest "PI" (2 chars)
  // Entry B: src ";\n  let x = 7;" (14 chars) -> dest ";\n  let x = 7;" (14 chars)
  const entries: SrcMapEntry[] = [
    { src, srcStart: 8, srcEnd: 33, destStart: 0, destEnd: 2 },
    { src, srcStart: 33, srcEnd: 47, destStart: 2, destEnd: 16 },
  ];
  const map = makeMap(entries);
  map.compact();
  expect(map.entries).toHaveLength(2);
});

test("compact merges adjacent entries with equal src/dest lengths", () => {
  const entries: SrcMapEntry[] = [
    { src, srcStart: 0, srcEnd: 5, destStart: 0, destEnd: 5 },
    { src, srcStart: 5, srcEnd: 10, destStart: 5, destEnd: 10 },
  ];
  const map = makeMap(entries);
  map.compact();
  expect(map.entries).toHaveLength(1);
  expect(map.entries[0]).toMatchObject({
    srcStart: 0,
    srcEnd: 10,
    destStart: 0,
    destEnd: 10,
  });
});

test("destToSrc returns correct position after compact with mixed-length entries", () => {
  // dest: "PI;\n  let x = 7;"
  //        ^^ entry A (2 chars dest, 25 chars src)
  //          ^^^^^^^^^^^^^^ entry B (14 chars dest, 14 chars src)
  const entries: SrcMapEntry[] = [
    { src, srcStart: 8, srcEnd: 33, destStart: 0, destEnd: 2 },
    { src, srcStart: 33, srcEnd: 47, destStart: 2, destEnd: 16 },
  ];
  const map = makeMap(entries);
  map.compact();

  // "x" in "let x = 7" is at dest offset 10 (inside entry B)
  const result = map.destToSrc(10);
  expect(result.position).toBe(41); // srcStart 33 + (10 - 2) = 41
});

test("destToSrc for unmapped position falls back to dest identity", () => {
  const entries: SrcMapEntry[] = [
    { src, srcStart: 0, srcEnd: 3, destStart: 0, destEnd: 3 },
    { src, srcStart: 10, srcEnd: 13, destStart: 10, destEnd: 13 },
  ];
  const map = makeMap(entries);

  // position 5 is in the gap between entries
  const result = map.destToSrc(5);
  expect(result.src).toBe(map.dest);
  expect(result.position).toBe(5);
});
