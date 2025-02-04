import { expect, test } from "vitest";
import { importSyntaxCases } from "wesl-testsuite";
import { weslImport } from "../ImportGrammar.js";
import { testAppParse } from "./TestUtil.js";
import { withLogSpy } from "mini-parse/test-util";

function expectParseFail(src: string): void {
  withLogSpy(() => {
    const result = testAppParse(weslImport, src);
    expect(result.stable.imports).toEqual([]); // TODO tighten test, shouldn't parse
  });
}

function expectParses(src: string): void {
  const result = testAppParse(weslImport, src);
  expect(result.stable.imports.length).toBeGreaterThan(0);
}

importSyntaxCases.forEach(c => {
  if (c.fails) {
    test(c.src, () => expectParseFail(c.src));
  } else {
    test(c.src, () => expectParses(c.src));
  }
});
