import { LexerFromStream, Parser, withLogger } from "mini-parse";
import {
  expectNoLog,
  logCatch,
  TestParseResult,
  testParseWithLexer,
} from "mini-parse/test-util";
import { WgslBundle } from "random_wgsl";
import { link, LinkConfig } from "../Linker.js";
import { parseWESL, syntheticWeslParseState, WeslAST } from "../ParseWESL.js";
import { Conditions } from "../Scope.js";
import { WeslStream } from "../parse/WeslStream.js";

export function testAppParse<T>(
  parser: Parser<T>,
  src: string,
): TestParseResult<T, WeslAST> {
  const appState = syntheticWeslParseState();
  const lexer = new LexerFromStream(new WeslStream(src), src);
  return testParseWithLexer(parser, lexer, appState);
}

/** Convenience wrapper to link wgsl for tests.
 * The first module is named "./test.wesl",
 * subsequent modules are named "./file1.wesl", "./file2.wesl", etc.
 */
export function linkTest(...rawWgsl: string[]): string {
  return linkTestOpts({}, ...rawWgsl);
}

export interface LinkTestOpts {
  /** additional modules to link */
  conditions?: Conditions;
  linkConfig?: LinkConfig;
  libs?: WgslBundle[];
}
export function linkTestOpts(opts: LinkTestOpts, ...rawWgsl: string[]): string {
  const [root, ...rest] = rawWgsl;
  const restWgsl = Object.fromEntries(
    rest.map((src, i) => [`./file${i + 1}.wesl`, src]),
  );
  const wesl = { "./test.wesl": root, ...restWgsl };

  const { conditions = {}, libs = [], linkConfig: config } = opts;
  const srcMap = link(wesl, "test", conditions, libs, config);
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
  return parseWESL(src, undefined, 500);
}
