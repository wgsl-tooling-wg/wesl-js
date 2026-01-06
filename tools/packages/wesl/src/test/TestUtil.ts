import { type Parser, type Stream, withLoggerAsync } from "mini-parse";
import {
  expectNoLog,
  logCatch,
  type TestParseResult,
  testParseWithStream,
} from "mini-parse/test-util";
import { expect } from "vitest";
import { type BoundAndTransformed, RecordResolver, type SrcModule } from "wesl";
import { bindAndTransform, type LinkParams, link } from "../Linker.ts";
import {
  parseSrcModule,
  syntheticWeslParseState,
  type WeslAST,
} from "../ParseWESL.ts";
import { WeslStream, type WeslToken } from "../parse/WeslStream.ts";
import { stripWesl } from "./StripWesl.ts";

export type LinkTestOpts = Pick<
  LinkParams,
  "conditions" | "libs" | "config" | "virtualLibs" | "constants" | "mangler"
>;

interface BindTestResult {
  bound: BoundAndTransformed;
  resolver: RecordResolver;
}

/** Compare WGSL/WESL by token sequence, ignoring whitespace. */
export function expectTokenMatch(actual: string, expected: string): void {
  expect(stripWesl(actual)).toBe(stripWesl(expected));
}

/** Parse a single wesl file. */
export function parseWESL(src: string): WeslAST {
  const srcModule: SrcModule = {
    modulePath: "package::test", // TODO not used outside of tests
    debugFilePath: "./test.wesl",
    src,
  };
  return parseSrcModule(srcModule);
}

/** Parse wesl, returning parse state and WeslAST. */ // LATER get rid of this
export function testAppParse<T>(
  parser: Parser<Stream<WeslToken>, T>,
  src: string,
): TestParseResult<T, WeslAST> {
  return testParseWithStream(
    parser,
    new WeslStream(src),
    syntheticWeslParseState(),
  );
}

/** Link wesl for tests. First module is ./test.wesl, rest are ./file1.wesl, etc. */
export async function linkTest(...rawWgsl: string[]): Promise<string> {
  return linkTestOpts({}, ...rawWgsl);
}

export async function linkTestOpts(opts: LinkTestOpts, ...rawWgsl: string[]) {
  const weslSrc = makeTestBundle(rawWgsl);
  const srcMap = await link({ weslSrc, rootModuleName: "test", ...opts });
  return srcMap.dest;
}

interface LogResult {
  log: string;
  result: string;
}

/** Link wesl for tests, capturing console output. */
export async function linkWithLog(...rawWgsl: string[]): Promise<LogResult> {
  return linkWithLogInternal(rawWgsl, false);
}

/** Link wesl for tests, capturing console output and swallowing exceptions. */
export async function linkWithLogQuietly(
  ...rawWgsl: string[]
): Promise<LogResult> {
  return linkWithLogInternal(rawWgsl, true);
}

async function linkWithLogInternal(
  rawWgsl: string[],
  quiet: boolean,
): Promise<LogResult> {
  const { log, logged } = logCatch();
  let result = "??";
  try {
    result = await withLoggerAsync(log, () => linkTest(...rawWgsl));
  } catch (e) {
    if (!quiet) console.error(e);
  }
  return { result, log: logged() };
}

/** Parse wesl for testing, ensuring no logged warnings. */
export function parseTest(src: string): WeslAST {
  return expectNoLog(() => parseWESL(src));
}

/** Parse wesl without log collection (for debugging). */
export function parseTestRaw(src: string): WeslAST {
  return parseWESL(src);
}

/** Parse and bind wesl source for testing. Returns bound result and resolver. */
export function bindTest(...rawWesl: string[]): BindTestResult {
  const weslSrc = makeTestBundle(rawWesl);
  const resolver = new RecordResolver(weslSrc, {
    packageName: "package",
    debugWeslRoot: "test",
  });
  const bound = bindAndTransform({ rootModuleName: "test", resolver });
  return { bound, resolver };
}

/** Synthesize test file bundle: ./test.wesl, ./file1.wesl, ./file2.wesl, etc. */
function makeTestBundle(rawWgsl: string[]): Record<string, string> {
  const [root, ...rest] = rawWgsl;
  const restFiles = Object.fromEntries(
    rest.map((src, i) => [`./file${i + 1}.wesl`, src]),
  );
  return { "./test.wesl": root, ...restFiles };
}
