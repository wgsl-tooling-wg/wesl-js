import { type Parser, type Stream, withLoggerAsync } from "mini-parse";
import {
  expectNoLog,
  logCatch,
  type TestParseResult,
  testParseWithStream,
} from "mini-parse/test-util";
import { type BoundAndTransformed, RecordResolver, type SrcModule } from "wesl";
import { bindAndTransform, type LinkParams, link } from "../Linker.ts";
import {
  parseSrcModule,
  syntheticWeslParseState,
  type WeslAST,
} from "../ParseWESL.ts";
import { WeslStream, type WeslToken } from "../parse/WeslStream.ts";
import { resetScopeIds } from "../Scope.ts";

/** Parse a single wesl file */
export function parseWESL(src: string): WeslAST {
  const srcModule: SrcModule = {
    modulePath: "package::test", // TODO this ought not be used outside of tests
    debugFilePath: "./test.wesl",
    src,
  };

  return parseSrcModule(srcModule);
}

/** Parse a single wesl file, returning the parse state as well as the WeslAST */ // LATER get rid of this
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

  const rootModuleName = "test";
  const srcMap = await link({ weslSrc, rootModuleName, ...opts });
  return srcMap.dest;
}

/** Link wesl for tests, capturing console output */
export async function linkWithLog(...rawWgsl: string[]): Promise<{
  log: string;
  result: string;
}> {
  return linkWithLogInternal(rawWgsl);
}

/** Link wesl for tests, capturing console output and swallowing exceptions */
export async function linkWithLogQuietly(...rawWgsl: string[]): Promise<{
  log: string;
  result: string;
}> {
  return linkWithLogInternal(rawWgsl, true);
}

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

/** Parse wesl for testing, ensuring no logged warnings */
export function parseTest(src: string): WeslAST {
  return expectNoLog(() => parseTestRaw(src));
}

/** Parse wesl without log collection (for debugging) */
export function parseTestRaw(src: string) {
  return parseWESL(src);
}

interface BindTestResult {
  bound: BoundAndTransformed;
  resolver: RecordResolver;
}

/** Parse and bind wesl source for testing. Returns bound result and resolver for inspection. */
export function bindTest(...rawWesl: string[]): BindTestResult {
  resetScopeIds();
  const weslSrc = makeTestBundle(rawWesl);

  const resolver = new RecordResolver(weslSrc, {
    packageName: "package",
    debugWeslRoot: "test",
  });
  const bound = bindAndTransform({
    rootModuleName: "test",
    resolver,
  });
  return { bound, resolver };
}

/** Synthesize test file bundle. Root module is ./test.wesl, others are ./file1.wesl, ./file2.wesl, etc. */
function makeTestBundle(rawWgsl: string[]): Record<string, string> {
  const [root, ...rest] = rawWgsl;
  const restWgsl = Object.fromEntries(
    rest.map((src, i) => [`./file${i + 1}.wesl`, src]),
  );
  return { "./test.wesl": root, ...restWgsl };
}
