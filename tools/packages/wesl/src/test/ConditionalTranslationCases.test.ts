import { afterAll, type TestContext, test } from "vitest";
import { conditionalTranslationCases } from "wesl-testsuite";
import { testFromCase, verifyCaseCoverage } from "./TestLink.ts";

const examplesByName = new Map(
  conditionalTranslationCases.map(t => [t.name, t]),
);

async function caseTest(ctx: TestContext): Promise<void> {
  return testFromCase(ctx.task.name, examplesByName);
}

// requires code stripping to be disabled (which wesl-js doesn't support)
const weslJsTests = conditionalTranslationCases.filter(
  c => c.name !== "conditional declaration shadowing",
);
afterAll(verifyCaseCoverage(weslJsTests));

test("@if on diagnostic directive", ctx => caseTest(ctx));
test("@if on enable directive", ctx => caseTest(ctx));
test("@if on requires directive", ctx => caseTest(ctx));
test("@if on global const declaration", ctx => caseTest(ctx));
test("@if on global override declaration", ctx => caseTest(ctx));
test("@if on global variable declaration", ctx => caseTest(ctx));
test("@if on type alias", ctx => caseTest(ctx));
test("@if on function declaration", ctx => caseTest(ctx));
test("@if on function formal parameter", ctx => caseTest(ctx));
test("@if on structure declaration", ctx => caseTest(ctx));
test("@if on structure member", ctx => caseTest(ctx));
test("@if on compound statement", ctx => caseTest(ctx));
test("@if on if statement", ctx => caseTest(ctx));
test("@if on switch statement", ctx => caseTest(ctx));
test("@if on switch clause", ctx => caseTest(ctx));
test("@if on loop statement", ctx => caseTest(ctx));
test("@if on for statement", ctx => caseTest(ctx));
test("@if on while statement", ctx => caseTest(ctx));
test("@if on break statement", ctx => caseTest(ctx));
test("@if on break-if statement", ctx => caseTest(ctx));
test("@if on continue statement", ctx => caseTest(ctx));
test("@if on continuing statement", ctx => caseTest(ctx));
test("@if on return statement", ctx => caseTest(ctx));
test("@if on discard statement", ctx => caseTest(ctx));
test("@if on call statement", ctx => caseTest(ctx));
test("@if on function-scope const_assert", ctx => caseTest(ctx));
test("@if short-circuiting OR", ctx => caseTest(ctx));
test("@if short-circuiting AND", ctx => caseTest(ctx));
test("@if logical NOT", ctx => caseTest(ctx));
test("@if parentheses", ctx => caseTest(ctx));
test("@if on module-scope const_assert", ctx => caseTest(ctx));

test("declaration shadowing", ctx => caseTest(ctx));

test("conditional import of const_assert", ctx => caseTest(ctx));
test("double conditional import of const_assert", ctx => caseTest(ctx));
test("conditional transitive const", ctx => caseTest(ctx));
test("conditional transitive fn", ctx => caseTest(ctx));

test("@else basic test", ctx => caseTest(ctx));
test("@if(true) @else", ctx => caseTest(ctx));
test("@else with functions", ctx => caseTest(ctx));
test("@else with struct members", ctx => caseTest(ctx));
test("@else with statements", ctx => caseTest(ctx));
test("@else with compound statements", ctx => caseTest(ctx));
test("nested @if/@else", ctx => caseTest(ctx));
test("multiple @if/@else chains", ctx => caseTest(ctx));
test("@else with conditional import", ctx => caseTest(ctx));
test("@else declaration shadowing", ctx => caseTest(ctx));
test("@else with variable references", ctx => caseTest(ctx));
test("@else with variable references false condition", ctx => caseTest(ctx));
test("@else with package function reference", ctx => caseTest(ctx));
