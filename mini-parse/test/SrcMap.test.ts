import { SrcMap } from "../SrcMap.ts";
import { expect, test } from "vitest";

test("compact", () => {
  const src = "a b";
  const dest = "|" + src + " d";

  const srcMap = new SrcMap({ text: dest });
  srcMap.addEntries([
    { src: { text: src }, srcStart: 0, srcEnd: 2, destStart: 1, destEnd: 3 },
    { src: { text: src }, srcStart: 2, srcEnd: 3, destStart: 3, destEnd: 4 },
  ]);
  srcMap.compact();
  expect(srcMap.entries).toMatchInlineSnapshot();
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
  expect(merged.entries).toMatchInlineSnapshot();
});
