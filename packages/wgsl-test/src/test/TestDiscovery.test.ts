import { expect, test } from "vitest";
import { findSnapshotFunctions, findTestFunctions } from "../TestDiscovery.ts";
import { parseTest as parse } from "./TestSupport.ts";

test("finds single @test function", () => {
  const ast = parse(`
    @test fn myTest() { }
  `);
  const tests = findTestFunctions(ast);
  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("myTest");
});

test("finds multiple @test functions", () => {
  const ast = parse(`
    @test fn testOne() { }
    fn helper() { }
    @test fn testTwo() { }
  `);
  const tests = findTestFunctions(ast);
  expect(tests).toHaveLength(2);
  expect(tests.map(t => t.name)).toEqual(["testOne", "testTwo"]);
});

test("ignores non-test functions", () => {
  const ast = parse(`
    fn notATest() { }
    @compute @workgroup_size(1) fn compute() { }
  `);
  const tests = findTestFunctions(ast);
  expect(tests).toHaveLength(0);
});

test("preserves FnElem for access to returnType", () => {
  const ast = parse(`
    @test fn returnsFloat() -> f32 { return 1.0; }
  `);
  const tests = findTestFunctions(ast);
  expect(tests).toHaveLength(1);
  expect(tests[0].fn.returnType).toBeDefined();
});

test("handles @test with other attributes", () => {
  const ast = parse(`
    @test @must_use fn withMustUse() -> bool { return true; }
  `);
  const tests = findTestFunctions(ast);
  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("withMustUse");
});

test("extracts description from @test(description)", () => {
  const ast = parse(`
    @test(pythagorean_triple) fn lengthSq3() { }
  `);
  const tests = findTestFunctions(ast);
  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("lengthSq3");
  expect(tests[0].description).toBe("pythagorean_triple");
});

test("description is undefined for plain @test", () => {
  const ast = parse(`
    @test fn simpleTest() { }
  `);
  const tests = findTestFunctions(ast);
  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBeUndefined();
});

test("findTestFunctions excludes @snapshot functions", () => {
  const ast = parse(`
    @test fn computeTest() { }
    @fragment @snapshot fn test_visual(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(1.0);
    }
  `);
  const tests = findTestFunctions(ast);
  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("computeTest");
});

test("finds single @fragment @snapshot function", () => {
  const ast = parse(`
    @fragment @extent(256, 256) @snapshot
    fn test_checker(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(1.0);
    }
  `);
  const snaps = findSnapshotFunctions(ast);
  expect(snaps).toHaveLength(1);
  expect(snaps[0].name).toBe("test_checker");
  expect(snaps[0].snapshotName).toBe("test_checker");
  expect(snaps[0].extent).toEqual([256, 256]);
});

test("snapshot name from @snapshot(custom_name)", () => {
  const ast = parse(`
    @fragment @extent(512, 512) @snapshot(hires_test)
    fn test_blur(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(0.0);
    }
  `);
  const snaps = findSnapshotFunctions(ast);
  expect(snaps).toHaveLength(1);
  expect(snaps[0].snapshotName).toBe("hires_test");
  expect(snaps[0].extent).toEqual([512, 512]);
});

test("default extent is 256x256 when @extent omitted", () => {
  const ast = parse(`
    @fragment @snapshot
    fn test_simple(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(1.0);
    }
  `);
  const snaps = findSnapshotFunctions(ast);
  expect(snaps[0].extent).toEqual([256, 256]);
});

test("finds multiple snapshot functions", () => {
  const ast = parse(`
    @fragment @extent(64, 64) @snapshot
    fn test_a(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(1.0);
    }
    @fragment @extent(128, 128) @snapshot
    fn test_b(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(0.0);
    }
  `);
  const snaps = findSnapshotFunctions(ast);
  expect(snaps).toHaveLength(2);
  expect(snaps.map(s => s.name)).toEqual(["test_a", "test_b"]);
});

test("@snapshot without @fragment is ignored", () => {
  const ast = parse(`
    @snapshot fn not_a_fragment() { }
  `);
  const snaps = findSnapshotFunctions(ast);
  expect(snaps).toHaveLength(0);
});

test("square extent from single param @extent(64)", () => {
  const ast = parse(`
    @fragment @extent(64) @snapshot
    fn test_sq(@builtin(position) pos: vec4f) -> @location(0) vec4f {
      return vec4f(1.0);
    }
  `);
  const snaps = findSnapshotFunctions(ast);
  expect(snaps[0].extent).toEqual([64, 64]);
});
