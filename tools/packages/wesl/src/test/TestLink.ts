import { expectTrimmedMatch, trimSrc } from "mini-parse/vitest-util";
import { expect, type RunnerTestSuite } from "vitest";
import type { WgslTestSrc } from "wesl-testsuite";
import { link } from "../Linker.ts";
import { type ManglerFn, underscoreMangle } from "../Mangler.ts";
import { weslParserConfig } from "../ParseWESL.ts";
import { mapValues } from "../Util.ts";

/** Link wesl sources and compare linked wgsl vs expectations (ignores whitespace). */
export async function testLink(
  weslSrc: Record<string, string>,
  rootModuleName: string,
  expectedWgsl: string,
  mangler?: ManglerFn,
): Promise<void> {
  const resultMap = await link({ weslSrc, rootModuleName, mangler });
  expectTrimmedMatch(resultMap.dest, expectedWgsl);
}

type CaseMap = Map<string, WgslTestSrc>;

/**
 * V2 parser emits `{const foo = 10; }` instead of `{ const foo = 10; }`.
 * TODO: Remove after dropping V1 parser
 */
function adjustV2Expectations(name: string, expected: string): string {
  if (!weslParserConfig.useV2Parser) {
    return expected;
  }

  const knownFormattingDifferences: Record<string, string> = {
    // V1: fn func() { { const foo = 10; } }
    "@if on compound statement": `
      fn func() {
        {
        const foo = 10; }
      }`,
    // V1: fn func() { if 0 < 1 { const foo = 10; } }
    "@if on if statement": `
      fn func() {
        if 0 < 1 {
        const foo = 10; }
      }`,
    // V1: fn func() { loop { const foo = 10; } }
    "@if on loop statement": `
      fn func() {
        loop {
        const foo = 10; }
      }`,
    // V1: fn func() { while true { const foo = 10; } }
    "@if on while statement": `
      fn func() {
        while true {
        const foo = 10; }
      }`,
    // V1: fn foo() { while true { break; } }  fn bar() { while true { } }
    "@if on break statement": `
      fn foo() { while true {  break; } }
      fn bar() { while true {  } }`,
  };

  return knownFormattingDifferences[name] || expected;
}

/** Test linking a single case from a shared test suite (ImportCases, etc.) */
export async function testFromCase(
  name: string,
  cases: CaseMap,
): Promise<void> {
  const testCase = cases.get(name);
  if (!testCase) throw new Error(`Skipping test "${name}"\nNo example found.`);

  const {
    weslSrc,
    expectedWgsl = "",
    underscoreWgsl = expectedWgsl,
  } = testCase;
  const trimmedWesl = mapValues(weslSrc, trimSrc);
  const rootName = Object.keys(weslSrc)[0];
  const expected = adjustV2Expectations(name, expectedWgsl);
  const underscoreExpected = adjustV2Expectations(name, underscoreWgsl);

  await testLink(trimmedWesl, rootName, expected);
  await testLink(trimmedWesl, rootName, underscoreExpected, underscoreMangle);
}

/** For afterAll(): verify all shared test suite cases are covered. */
export function verifyCaseCoverage(caseList: WgslTestSrc[]) {
  return (suite: RunnerTestSuite) => {
    const testNames = new Set(suite.tasks.map(t => t.name));
    const missing = caseList
      .map(c => c.name)
      .filter(name => !testNames.has(name));
    if (missing.length) {
      console.error("Missing tests for cases:", missing);
      expect("missing test: " + missing.toString()).toBe("");
    }
  };
}
