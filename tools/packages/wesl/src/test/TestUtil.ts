import { Parser, Stream, withLoggerAsync } from "mini-parse";
import {
  expectNoLog,
  logCatch,
  TestParseResult,
  testParseWithStream,
} from "mini-parse/test-util";
import {
  BoundAndTransformed,
  ParsedRegistry,
  parsedRegistry,
  parseIntoRegistry,
} from "wesl";
import { bindAndTransform, link, LinkParams } from "../Linker.js";
import { WeslStream, WeslToken } from "../parse/WeslStream.js";
import { SrcModule, WeslAST } from "../Module.js";
import { parseSrcModule } from "../lower/TranslationUnit.js";

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
  const weslSrc = makeTestBundle(rawWgsl);

  const rootModulePath = ["package", "test"];
  const srcMap = await link({ weslSrc, rootModulePath, ...opts });
  return srcMap.dest;
}

/** Link wesl for tests, and return the console log as well */
export async function linkWithLog(...rawWgsl: string[]): Promise<{
  log: string;
  result: string;
}> {
  return linkWithLogInternal(rawWgsl);
}

/** Link wesl for tests, and return the console log as well.
 * Quietly swallow any exceptions thrown */
export async function linkWithLogQuietly(...rawWgsl: string[]): Promise<{
  log: string;
  result: string;
}> {
  return linkWithLogInternal(rawWgsl, true);
}

/** link wesl for tests */
async function linkWithLogInternal(
  rawWgsl: string[],
  quiet = false,
): Promise<{
  log: string;
  result: string;
}> {
  const { log, logged } = logCatch();
  let result = "??";
  try {
    result = await withLoggerAsync(log, async () => linkTest(...rawWgsl));
  } catch (e) {
    if (!quiet) console.error(e);
  }
  return { result, log: logged() };
}

export function parseWESL(src: string): WeslAST {
  const srcModule: SrcModule = {
    modulePath: "package::test",
    debugFilePath: "./test.wesl",
    src,
  };

  return parseSrcModule(srcModule);
}

/** parse wesl for testing, and return the AST */
export function parseTest(src: string): WeslAST {
  return expectNoLog(() => parseTestRaw(src));
}

/** test w/o any log collection, to not confuse debugging */
export function parseTestRaw(src: string) {
  return parseWESL(src);
}

interface BindTestResult {
  bound: BoundAndTransformed;
  registry: ParsedRegistry;
}

/**
 * Test parsing and binding some wesl src.
 * @return both the bound result and the internal registry.
 * (since binding mutates the AST, it's useful for tests to review)
 */
export function bindTest(...rawWesl: string[]): BindTestResult {
  resetScopeIds();
  const weslSrc = makeTestBundle(rawWesl);

  const registry = parsedRegistry();
  parseIntoRegistry(weslSrc, registry, "package", "test");
  const bound = bindAndTransform({ rootModuleName: "test", registry });
  return { bound, registry };
}

/** @return a weslSrc record for tests by synthesizing file names
 * The root module is named ./test.wesl
 */
function makeTestBundle(rawWgsl: string[]): Record<string, string> {
  const [root, ...rest] = rawWgsl;
  const restWgsl = Object.fromEntries(
    rest.map((src, i) => [`./file${i + 1}.wesl`, src]),
  );
  return { "./test.wesl": root, ...restWgsl };
}
