import { WgslTestSrc } from "wesl-testsuite";
import { link } from "../Linker.js";
import { ManglerFn, underscoreMangle } from "../Mangler.ts";
import { expectTrimmedMatch, trimSrc } from "./shared/StringUtil.js";

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
