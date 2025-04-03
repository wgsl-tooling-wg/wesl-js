import { conditionalTranslationCases } from "wesl-testsuite";
import { testFromCase } from "./TestLink.ts";
import { test } from "vitest";

// requires code stripping to be disabled (which wesl-js doesn't support)
const weslJsTests = conditionalTranslationCases.filter(
  (c) => c.name !== "conditional declaration shadowing",
);

weslJsTests.forEach((c) => {
  test(c.name, () => testFromCase(c));
});

test("For debugging", () =>
  testFromCase(
    conditionalTranslationCases.find((v) =>
      v.name === "@if on diagnostic directive"
    )!,
  ));
