import { afterAll, expect, test } from "vitest";
import { importCases } from "wesl-testsuite";
import { link } from "../Linker.js";
import { expectTrimmedMatch, trimSrc } from "./shared/StringUtil.js";
import { underscoreMangle } from "../Mangler.js";

// wgsl example src, indexed by name
const examplesByName = new Map(importCases.map(t => [t.name, t]));

test("import package::bar::foo;", ctx => importCaseTest(ctx.task.name));
test("main has other root elements", ctx => importCaseTest(ctx.task.name));
test("import foo as bar", ctx => importCaseTest(ctx.task.name));
test("import twice doesn't get two copies", ctx =>
  importCaseTest(ctx.task.name));
test("imported fn calls support fn with root conflict", ctx =>
  importCaseTest(ctx.task.name));
test("import twice with two as names", ctx => importCaseTest(ctx.task.name));
test("import transitive conflicts with main", ctx =>
  importCaseTest(ctx.task.name));
test("multiple exports from the same module", ctx =>
  importCaseTest(ctx.task.name));
test("import and resolve conflicting support function", ctx =>
  importCaseTest(ctx.task.name));
test("import support fn that references another import", ctx =>
  importCaseTest(ctx.task.name));
test("import support fn from two exports", ctx =>
  importCaseTest(ctx.task.name));
test("import a struct", ctx => importCaseTest(ctx.task.name));
test("struct referenced by a fn param", ctx => importCaseTest(ctx.task.name));
test("import fn with support struct constructor", ctx =>
  importCaseTest(ctx.task.name));
test("import a transitive struct", ctx => importCaseTest(ctx.task.name));
test("'import as' a struct", ctx => importCaseTest(ctx.task.name));
test("import a struct with name conflicting support struct", ctx =>
  importCaseTest(ctx.task.name));
test("copy alias to output", ctx => importCaseTest(ctx.task.name));
test("copy diagnostics to output", ctx => importCaseTest(ctx.task.name));
test("const referenced by imported fn", ctx => importCaseTest(ctx.task.name));
test("fn call with a separator", ctx => importCaseTest(ctx.task.name));
test("local var to struct", ctx => importCaseTest(ctx.task.name));
test("global var to struct", ctx => importCaseTest(ctx.task.name));
test("return type of function", ctx => importCaseTest(ctx.task.name));
test("import a const", ctx => importCaseTest(ctx.task.name));
test("import an alias", ctx => importCaseTest(ctx.task.name));
test("alias f32", ctx => importCaseTest(ctx.task.name));
test("fn f32()", ctx => importCaseTest(ctx.task.name));
test("circular import", ctx => importCaseTest(ctx.task.name));

// test(, ctx =>
//   linkTest2(ctx.task.name, {
//     linked: `
//     `,
//   });
// });

// TODO add case for const_assert in non root module
// TODO add case for diagnostic in non-root module (should fail?)

afterAll(c => {
  const testNameSet = new Set(c.tasks.map(t => t.name));
  const cases = importCases.map(c => c.name);
  const missing = cases.filter(name => !testNameSet.has(name));
  if (missing.length) {
    console.error("Missing tests for cases:", missing);
    expect("missing test: " + missing.toString()).toBe("");
  }
});

async function importCaseTest(name: string): Promise<void> {
  /* -- find and trim source texts -- */
  const caseFound = examplesByName.get(name);
  if (!caseFound) {
    throw new Error(`Skipping test "${name}"\nNo example found.`);
  }

  const {
    weslSrc,
    expectedWgsl = "",
    underscoreWgsl = expectedWgsl,
  } = caseFound;

  const srcEntries = Object.entries(weslSrc).map(([name, wgsl]) => {
    const trimmedSrc = trimSrc(wgsl);
    return [name, trimmedSrc] as [string, string];
  });

  const trimmedWeslSrc = Object.fromEntries(srcEntries);

  /* -- link -- */
  const stdResultMap = await link({
    weslSrc: trimmedWeslSrc,
    rootModuleName: srcEntries[0][0],
  });
  const stdResult = stdResultMap.dest;

  const underscoreResultMap = await link({
    weslSrc: trimmedWeslSrc,
    rootModuleName: srcEntries[0][0],
    mangler: underscoreMangle,
  });
  const underscoreResult = underscoreResultMap.dest;

  /* -- trim and verify results line by line -- */
  expectTrimmedMatch(stdResult, expectedWgsl);
  expectTrimmedMatch(underscoreResult, underscoreWgsl);
}
