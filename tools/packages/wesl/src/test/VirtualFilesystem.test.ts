import { expect, test } from "vitest";
import { makeWeslPath } from "../VirtualFilesystem";

test("accept valid paths", () => {
  const paths = ["./foo.wesl", "foo.wesl", "bar.wgsl", "./foo/bar/baz.wgsl"];
  for (const p of paths) {
    expect(makeWeslPath(p)).toBe(p);
  }
});

test("reject invalid paths", () => {
  const paths = [
    ".foo.wesl",
    "foo.js",
    "../bar.wgsl",
    "./foo/./bar/baz.wgsl",
    "./foo//bar.wgsl",
    ".\\foo.wgsl",
  ];
  for (const p of paths) {
    expect(() => makeWeslPath(p)).toThrow();
  }
});
