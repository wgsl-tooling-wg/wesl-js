import { Parser, Stream, withLoggerAsync } from "mini-parse";
import {
  expectNoLog,
  logCatch,
  TestParseResult,
  testParseWithStream,
} from "mini-parse/test-util";
import { link, LinkParams } from "../Linker.js";
import { WeslStream, WeslToken } from "../parse/WeslStream.js";
import { parseWESL, WeslAST } from "../ParseWESL.js";

export function testAppParse<T>(
  parser: Parser<Stream<WeslToken>, T>,
  src: string,
): TestParseResult<T> {
  const stream = new WeslStream(src);
  return testParseWithStream(parser, stream);
}

/** Convenience wrapper to link wgsl for tests.
 * The first module is named "./test.wesl",
 * subsequent modules are named "./file1.wesl", "./file2.wesl", etc.
 */
export async function linkTest(...rawWgsl: string[]): Promise<string> {
  return linkTestOpts({}, ...rawWgsl);
}

export type LinkTestOpts = Pick<
  LinkParams,
  "conditions" | "libs" | "config" | "virtualLibs" | "constants" | "mangler"
>;

export async function linkTestOpts(
  opts: LinkTestOpts,
  ...rawWgsl: string[]
): Promise<string> {
  const [root, ...rest] = rawWgsl;
  const restWgsl = Object.fromEntries(
    rest.map((src, i) => [`./file${i + 1}.wesl`, src]),
  );
  const weslSrc = { "./test.wesl": root, ...restWgsl };

  const rootModuleName = "test";
  const srcMap = await link({ weslSrc, rootModuleName, ...opts });
  return srcMap.dest;
}

/** link wesl for tests, and return the console log as well */
export async function linkWithLog(...rawWgsl: string[]): Promise<{
  log: string;
  result: string;
}> {
  const { log, logged } = logCatch();
  let result = "??";
  try {
    result = await withLoggerAsync(log, async () => linkTest(...rawWgsl));
  } catch (e) {
    console.error(e);
  }
  return { result, log: logged() };
}

/** parse wesl for testing, and return the AST */
export function parseTest(src: string): WeslAST {
  return expectNoLog(() => parseTestRaw(src));
}

/** test w/o any log collection, to not confuse debugging */
export function parseTestRaw(src: string) {
  return parseWESL(src);
}
