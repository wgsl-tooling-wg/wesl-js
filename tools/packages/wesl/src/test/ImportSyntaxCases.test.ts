import { withLogSpy } from "mini-parse/test-util";
import { expect, test } from "vitest";
import { importSyntaxCases } from "wesl-testsuite";
import { import_statement } from "../parse/ImportGrammar.js";
import { testAppParse } from "./TestUtil.js";
import { repeatPlus } from "mini-parse";

function expectParseFail(src: string): void {
  withLogSpy(() => {
    expect(() => testAppParse(repeatPlus(import_statement), src)).toThrow();
  });
}

function expectParses(src: string): void {
  const result = testAppParse(repeatPlus(import_statement), src);
  expect(result.parsed).not.toBe(null);
  expect(result.parsed!.value.length).toBeGreaterThan(0);
}

importSyntaxCases.forEach(c => {
  if (c.fails) {
    test(c.src, () => expectParseFail(c.src));
  } else {
    test(c.src, () => expectParses(c.src));
  }
});
