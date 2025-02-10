import { expect, test } from "vitest";
import { RelativePath } from "../PathUtil.js";

// ../../../lib/webgpu-samples/src/anim/anim.wgsl

test("parse ./foo", () => {
  const n = RelativePath.parse("./foo");
  expect(n.components).toEqual(["foo"]);
});

test("parse ./foo/./", () => {
  const n = RelativePath.parse("./foo/./");
  expect(n.components).toEqual(["foo"]);
});

test("parse foo/bar/..", () => {
  const n = RelativePath.parse("foo/bar/..");
  expect(n.components).toEqual(["foo"]);
});

test("parse ./foo/bar/../.", () => {
  const n = RelativePath.parse("./foo/bar/../.");
  expect(n.components).toEqual(["foo"]);
});

test("throw exception for ../foo", () => {
  expect(() => RelativePath.parse("../foo")).toThrow();
});

test("strip ./foo from foo/bar", () => {
  const n = RelativePath.parse("foo/bar");
  expect(n.components).toEqual(["foo", "bar"]);
  const n2 = n.stripPrefix(RelativePath.parse("./foo"));
  expect(n2.components).toEqual(["bar"]);
});
