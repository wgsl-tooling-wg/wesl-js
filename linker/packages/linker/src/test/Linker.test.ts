import { expect, test } from "vitest";
import { expectTrimmedMatch } from "./shared/StringUtil.js";
import { linkTest } from "./TestUtil.js";
import { parsedRegistry, parseIntoRegistry } from "../ParsedRegistry.js";

test("link global var", () => {
  const src = `var x: i32 = 1;`;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("link an alias", () => {
  const src = `
    alias Num = f32;

    fn main() { Num(1.0); }
  `;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("link a const_assert", () => {
  const src = `
    var x = 1;
    var y = 2;
    const_assert x < y;
  `;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("link a struct", () => {
  const src = `
    struct Point {
      x: i32,
      y: i32,
    }
  `;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("link a fn", () => {
  const src = `
    fn foo(x: i32, y: u32) -> f32 { 
      return 1.0; 
    }`;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("handle a ptr type", () => {
  const src = `
    fn uint_bitfieldExtract_u1_i1_i1_(
      value: ptr<function, u32>, 
      bits: ptr<function, i32>) -> u32 { }
  `;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("struct after var", () => {
  const src = `
    var config: TwoPassConfig;

    struct TwoPassConfig {
      x: u32,
    }
  `;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("type inside fn with same name as fn", () => {
  // illegal but shouldn't hang
  const src = `
    fn foo() {
      var a:foo;
    }
    fn bar() {}
  `;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("call cross reference", () => {
  const src = `
    fn foo() {
      bar();
    }

    fn bar() {
      foo();
    }
  `;

  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("struct self reference", () => {
  const src = `
    struct A {
      a: A,
      b: B,
    }
    struct B {
      f: f32,
    }
  `;

  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("parse texture_storage_2d with texture format in typical type position", () => {
  const src = `var t: texture_storage_2d<rgba8unorm, write>;`;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("struct member ref with extra component_or_swizzle", () => {
  const src = `
    struct C { p: P }
    struct P { x: u32 }
    fn foo(c: C) {
      let a = c.p.x;
    }
 `;
  const result = linkTest(src);
  expectTrimmedMatch(result, src);
});

test("parse into registry", () => {
  const src = "struct A { a: f32 }";
  const registry = parsedRegistry();
  parseIntoRegistry({ "./foo/bar/baz": src, a1: src }, registry);
  expect(new Set(registry.modulesIter().map(v => v[0]))).toEqual(
    new Set(["package::foo::bar::baz", "package::a1"]),
  );
});
