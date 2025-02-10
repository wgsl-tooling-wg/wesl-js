import { Parser, Stream, withLogger } from "mini-parse";
import {
  expectNoLog,
  logCatch,
  TestParseResult,
  testParseWithStream,
} from "mini-parse/test-util";
import { link, LinkParams } from "../Linker.js";
import { WeslStream, WeslToken } from "../parse/WeslStream.js";
import { parseWESL, syntheticWeslParseState, WeslAST } from "../ParseWESL.js";

export function testAppParse<T>(
  parser: Parser<Stream<WeslToken>, T>,
  src: string,
): TestParseResult<T, WeslAST> {
  const appState = syntheticWeslParseState();
  const stream = new WeslStream(src);
  return testParseWithStream(parser, stream, appState);
}

/** Convenience wrapper to link wgsl for tests.
 * The first module is named "./test.wesl",
 * subsequent modules are named "./file1.wesl", "./file2.wesl", etc.
 */
export function linkTest(...rawWgsl: string[]): string {
  return linkTestOpts({}, ...rawWgsl);
}

export type LinkTestOpts = Pick<
  LinkParams,
  "conditions" | "libs" | "config" | "virtualModules"
>;

export function linkTestOpts(opts: LinkTestOpts, ...rawWgsl: string[]): string {
  const [root, ...rest] = rawWgsl;
  const restWgsl = Object.fromEntries(
    rest.map((src, i) => [`./file${i + 1}.wesl`, src]),
  );
  const weslSrc = { "./test.wesl": root, ...restWgsl };

  const rootModulePath = "test.wesl";
  const srcMap = link({ weslSrc, rootModulePath, ...opts });
  return srcMap.dest;
}

/** link wesl for tests, and return the console log as well */
export function linkWithLog(...rawWgsl: string[]): {
  log: string;
  result: string;
} {
  const { log, logged } = logCatch();
  let result = "???";
  withLogger(log, () => {
    try {
      result = linkTest(...rawWgsl);
    } catch (e) {}
  });
  return { result, log: logged() };
}

/** parse wesl for testing, and return the AST */
export function parseTest(src: string): WeslAST {
  return expectNoLog(() => parseTestRaw(src));
}

/** test w/o any log collection, to not confuse debugging */
export function parseTestRaw(src: string) {
  return parseWESL(src, undefined);
}
