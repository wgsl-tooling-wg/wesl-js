import { withLogSpy } from "@wesl/mini-parse/test-util";
import { expect, test } from "vitest";
import { importSyntaxCases } from "wesl-testsuite";
import { weslImports } from "../parse/ImportGrammar.ts";
import { testAppParse } from "./TestUtil.ts";

function expectParseFail(src: string): void {
  withLogSpy(() => {
    expect(() => testAppParse(weslImports, src)).toThrow(); // LATER catch specific error only
  });
}

function expectParses(src: string): void {
  const result = testAppParse(weslImports, src);
  expect(result.stable.imports.length).toBeGreaterThan(0);
}

importSyntaxCases.forEach((c) => {
  if (c.fails) {
    test(c.src, () => expectParseFail(c.src));
  } else {
    test(c.src, () => expectParses(c.src));
  }
});
