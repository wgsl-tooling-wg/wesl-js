import { expectTrimmedMatch, trimSrc } from "@wesl/mini-parse/vitest-util";
import type { WgslTestSrc } from "wesl-testsuite";
import { link } from "../Linker.ts";
import { type ManglerFn, underscoreMangle } from "../Mangler.ts";
import { resetScopeIds } from "../Scope.ts";

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
  resetScopeIds();
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

/**
 * Test link one test case from one a shared test suite
 *  (ImportCases, ConditionalTranslationCases, etc.)
 */
export async function testFromCase(
  caseFound: WgslTestSrc,
): Promise<void> {
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
