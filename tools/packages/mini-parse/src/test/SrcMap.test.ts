import { expect, test } from "vitest";
import { SrcMap } from "../SrcMap.js";

test("compact", () => {
  const src = "a b";
  const dest = "|" + src + " d";

  const srcMap = new SrcMap(dest);
  srcMap.addEntries([
    { src, srcSpan: [0, 2], destSpan: [1, 3] },
    { src, srcSpan: [2, 3], destSpan: [3, 4] },
  ]);
  srcMap.compact();
  expect(srcMap.entries).toMatchInlineSnapshot(`
    [
      {
        "destSpan": [
          1,
          4,
        ],
        "src": "a b",
        "srcSpan": [
          0,
          3,
        ],
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

  const map1 = new SrcMap(mid, [{ src, srcSpan: [0, 3], destSpan: [1, 4] }]);

  const map2 = new SrcMap(dest, [
    { src: mid, srcSpan: [1, 4], destSpan: [3, 6] },
    { src: src2, srcSpan: [0, 1], destSpan: [8, 9] },
  ]);

  const merged = map1.merge(map2);
  expect(merged.entries).toMatchInlineSnapshot(`
    [
      {
        "destSpan": [
          3,
          6,
        ],
        "src": "a b",
        "srcSpan": [
          0,
          3,
        ],
      },
      {
        "destSpan": [
          8,
          9,
        ],
        "src": "d",
        "srcSpan": [
          0,
          1,
        ],
      },
    ]
  `);
});
