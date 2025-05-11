import { expectTrimmedMatch } from "mini-parse/vitest-util";
import { test } from "vitest";
import { linkTest } from "./TestUtil.js";

test("link global var", async () => {
  const src = `var x: i32 = 1;`;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("link an alias", async () => {
  const src = `
    alias Num = f32;

    fn main() { Num(1.0); }
  `;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("link a const_assert", async () => {
  const src = `
    var x = 1;
    var y = 2;
    const_assert x < y;
  `;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("link a struct", async () => {
  const src = `
    struct Point {
      x: i32,
      y: i32,
    }
  `;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("link a fn", async () => {
  const src = `
    fn foo(x: i32, y: u32) -> f32 { 
      return 1.0; 
    }`;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("handle a ptr type", async () => {
  const src = `
    fn uint_bitfieldExtract_u1_i1_i1_(value: ptr<function, u32>, bits: ptr<function, i32>) -> u32 { }
  `;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("struct after var", async () => {
  const src = `
    var config: TwoPassConfig;

    struct TwoPassConfig { x: u32 }
  `;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("type inside fn with same name as fn", async () => {
  // illegal but shouldn't hang
  const src = `
    fn foo() {
      var a:foo;
    }
    fn bar() {}
  `;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("call cross reference", async () => {
  const src = `
    fn foo() {
      bar();
    }

    fn bar() {
      foo();
    }
  `;

  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("struct self reference", async () => {
  const src = `
    struct A {
      a: A,
      b: B,
    }
    struct B { f: f32 }
  `;

  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("parse texture_storage_2d with texture format in typical type position", async () => {
  const src = "var t: texture_storage_2d<rgba8unorm, write>;";
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});

test("struct member ref with extra component_or_swizzle", async () => {
  const src = `
    struct C { p: P }
    struct P { x: u32 }
    fn foo(c: C) {
      let a = c.p.x;
    }
 `;
  const result = await linkTest(src);
  expectTrimmedMatch(result, src);
});
