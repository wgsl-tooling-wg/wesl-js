import { expect, test } from "vitest";
import { SrcMap } from "../SrcMap.ts";

test("compact", () => {
  const src = "a b";
  const dest = "|" + src + " d";

  const srcMap = new SrcMap({ text: dest });
  srcMap.addEntries([
    { src: { text: src }, srcStart: 0, srcEnd: 2, destStart: 1, destEnd: 3 },
    { src: { text: src }, srcStart: 2, srcEnd: 3, destStart: 3, destEnd: 4 },
  ]);
  srcMap.compact();
  expect(srcMap.entries).toMatchInlineSnapshot(`
    [
      {
        "destEnd": 4,
        "destStart": 1,
        "src": {
          "text": "a b",
        },
        "srcEnd": 3,
        "srcStart": 0,
      },
    ]
  `);
});

test("merge", () => {
  const src = "a b";
  const src2 = "d";
  const mid = "|" + src + " " + src2;
  const dest = "xx" + mid + " z";
  /*
    mid:
      01234567890
      |a b d
    dest:
      01234567890
      xx|a b d z
  */

  const map1 = new SrcMap({ text: mid }, [
    { src: { text: src }, srcStart: 0, srcEnd: 3, destStart: 1, destEnd: 4 },
  ]);

  const map2 = new SrcMap({ text: dest }, [
    { src: { text: mid }, srcStart: 1, srcEnd: 4, destStart: 3, destEnd: 6 },
    { src: { text: src2 }, srcStart: 0, srcEnd: 1, destStart: 8, destEnd: 9 },
  ]);

  const merged = map1.merge(map2);
  expect(merged.entries).toMatchInlineSnapshot(`
    [
      {
        "destEnd": 6,
        "destStart": 3,
        "src": {
          "text": "a b",
        },
        "srcEnd": 3,
        "srcStart": 0,
      },
      {
        "destEnd": 9,
        "destStart": 8,
        "src": {
          "text": "d",
        },
        "srcEnd": 1,
        "srcStart": 0,
      },
    ]
  `);
});
