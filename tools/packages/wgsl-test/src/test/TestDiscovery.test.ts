import { expect, test } from "vitest";
import { parseSrcModule } from "wesl";
import { findTestFunctions } from "../TestDiscovery.ts";

function parse(src: string) {
  return parseSrcModule({
    modulePath: "test",
    debugFilePath: "test.wesl",
    src,
  });
}

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
