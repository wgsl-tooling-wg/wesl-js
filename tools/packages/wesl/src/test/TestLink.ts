import { link } from "../Linker.js";
import { ManglerFn } from "../Mangler.ts";
import { expectTrimmedMatch } from "./shared/StringUtil.js";

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
