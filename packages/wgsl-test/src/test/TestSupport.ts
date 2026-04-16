import { readFileSync } from "node:fs";
import { parseSrcModule, type WeslAST } from "wesl";

const fixturesDir = new URL(
  "./fixtures/wesl_test_pkg/shaders/",
  import.meta.url,
);

/** Read a .wesl fixture file from the test fixtures directory. */
export function loadFixture(name: string): string {
  return readFileSync(new URL(name, fixturesDir), "utf-8");
}

/** Parse a WESL source string into an AST for test assertions. */
export function parseTest(src: string): WeslAST {
  return parseSrcModule({
    modulePath: "test",
    debugFilePath: "test.wesl",
    src,
  });
}
