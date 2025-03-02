import { afterAll, expect, test, TestContext } from "vitest";
import { conditionalTranslationCases } from "wesl-testsuite";
import { testFromCase, verifyCaseCoverage } from "./TestLink.js";

const examplesByName = new Map(
  conditionalTranslationCases.map(t => [t.name, t]),
);

async function caseTest(ctx: TestContext): Promise<void> {
  return testFromCase(ctx.task.name, examplesByName);
}

test.skip("@if on diagnostic directive", ctx => caseTest(ctx));
test.skip("@if on enable directive", ctx => caseTest(ctx));
test.skip("@if on requires directive", ctx => caseTest(ctx));
test.skip("@if on global const declaration", ctx => caseTest(ctx));
test.skip("@if on global override declaration", ctx => caseTest(ctx));
test.skip("@if on global variable declaration", ctx => caseTest(ctx));
test.skip("@if on type alias", ctx => caseTest(ctx));
test.skip("@if on module scope const_assert", ctx => caseTest(ctx));
test.skip("@if on function declaration", ctx => caseTest(ctx));
test.skip("@if on function formal parameter", ctx => caseTest(ctx));
test.skip("@if on structure declaration", ctx => caseTest(ctx));
test.skip("@if on structure member", ctx => caseTest(ctx));
test.skip("@if on compound statement", ctx => caseTest(ctx));
test.skip("@if on if statement", ctx => caseTest(ctx));
test.skip("@if on switch statement", ctx => caseTest(ctx));
test.skip("@if on switch clause", ctx => caseTest(ctx));
test.skip("@if on loop statement", ctx => caseTest(ctx));
test.skip("@if on for statement", ctx => caseTest(ctx));
test.skip("@if on while statement", ctx => caseTest(ctx));
test.skip("@if on break statement", ctx => caseTest(ctx));
test.skip("@if on break-if statement", ctx => caseTest(ctx));
test.skip("@if on continue statement", ctx => caseTest(ctx));
test.skip("@if on continuing statement", ctx => caseTest(ctx));
test.skip("@if on return statement", ctx => caseTest(ctx));
test.skip("@if on discard statement", ctx => caseTest(ctx));
test.skip("@if on call statement", ctx => caseTest(ctx));
test.skip("@if on function-scope const_assert", ctx => caseTest(ctx));
test.skip("@if short-circuiting OR", ctx => caseTest(ctx));
test.skip("@if short-circuiting AND", ctx => caseTest(ctx));
test.skip("@if logical NOT", ctx => caseTest(ctx));
test.skip("@if parentheses", ctx => caseTest(ctx));
test.skip("contitional declaration shadowing", ctx => caseTest(ctx));
test.skip("contitional import of const_assert", ctx => caseTest(ctx));

afterAll(verifyCaseCoverage(conditionalTranslationCases));
