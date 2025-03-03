import { expect, test } from "vitest";
import { SrcMap } from "../SrcMap.js";

test("map 1:1 correspondence", () => {
  const source = { text: "let foo;" };
  const srcMap = new SrcMap();
  const builder = srcMap.builderFor(source);
  builder.add("let", [0, 3]);
  builder.addSynthetic(" ");
  builder.addName("foo", [4, 7]);

  expect(srcMap.destToSrc(0)).toEqual({
    src: source,
    position: 0,
  });
  expect(srcMap.destToSrc(1)).toEqual({
    src: source,
    position: 1,
  });
  expect(srcMap.destToSrc(3)?.position).toBe(3);
  expect(srcMap.destToSrc(4)?.position).toBe(4);
  expect(srcMap.destToSrc(5)?.position).toBe(5);
  expect(srcMap.destToSrc(7)?.position).toBe(7);
  expect(srcMap.destToSrc(8)).toBe(null);
});

test("map shifted and renamed", () => {
  const source = { text: "let foo;" };
  const srcMap = new SrcMap();
  const builder = srcMap.builderFor(source);
  builder.add("const", [0, 3]);
  builder.addSynthetic(" ");
  builder.addName("nya", [4, 7]);
  builder.addSynthetic(";");

  expect(srcMap.code).toBe("const nya;");

  expect(srcMap.destToSrc(0)?.position).toBe(0);
  expect(srcMap.destToSrc(1)?.position).toBe(0);
  expect(srcMap.destToSrc(3)?.position).toBe(0);
  expect(srcMap.destToSrc(5)?.position).toBe(3);
  expect(srcMap.destToSrc(6)?.position).toBe(4);
  expect(srcMap.destToSrc(7)?.position).toBe(4);
  expect(srcMap.destToSrc(9)?.position).toBe(7);
  expect(srcMap.destToSrc(10)).toBe(null);
});
