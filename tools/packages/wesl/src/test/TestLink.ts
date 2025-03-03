import { expectTrimmedMatch, trimSrc } from "mini-parse/vitest-util";
import { expect, RunnerTestSuite } from "vitest";
import { WgslTestSrc } from "wesl-testsuite";
import { link } from "../Linker.js";
import { ManglerFn, underscoreMangle } from "../Mangler.ts";

/**
 * Link wesl sources and compare the linked wgsl vs expectations.
 * Ignores blank lines and initial blank columns.
 *
 * (for tests)
 */
export async function testLink(
  weslSrc: Record<string, string>,
  rootModuleName: string,
  expectedWgsl: string,
  mangler?: ManglerFn,
): Promise<void> {
  /* -- link -- */
  const stdResultMap = await link({
    weslSrc,
    rootModuleName,
    mangler,
  });
  const stdResult = stdResultMap.dest;

  /* -- trim and verify results line by line -- */
  expectTrimmedMatch(stdResult, expectedWgsl);
}

type TestCaseMap = Map<string, WgslTestSrc>;

/**
 * Test link one test case from one a shared test suite
 *  (ImportCases, ConditionalTranslationCases, etc.)
 */
export async function testFromCase(
  name: string,
  cases: TestCaseMap,
): Promise<void> {
  /* -- find and trim source texts -- */
  const caseFound = cases.get(name);
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

  const trimmedWesl = Object.fromEntries(srcEntries);

  const rootName = srcEntries[0][0];
  await testLink(trimmedWesl, rootName, expectedWgsl);
  await testLink(trimmedWesl, rootName, underscoreWgsl, underscoreMangle);
}

/**
 * for afterAll(), to verify that all cases are covered from one of the shared test suites
 */
export function verifyCaseCoverage(
  caseList: WgslTestSrc[],
): (suite: RunnerTestSuite) => void {
  return function verifyCases(suite: RunnerTestSuite) {
    const testNameSet = new Set(suite.tasks.map(t => t.name));
    const caseNames = caseList.map(c => c.name);
    const missing = caseNames.filter(name => !testNameSet.has(name));
    if (missing.length) {
      console.error("Missing tests for cases:", missing);
      expect("missing test: " + missing.toString()).toBe("");
    }
  };
}
