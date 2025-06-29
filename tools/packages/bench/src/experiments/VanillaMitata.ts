import * as mitata from "mitata";
import type { BenchTest } from "../../bin/bench.ts";
import {
  type ParserVariant,
  createVariantFunction,
} from "../BenchVariations.ts";

/** benchmark using the high level mitata.bench() api. */
export async function simpleMitataBench(
  tests: BenchTest[],
  variants: ParserVariant[],
  useBaseline: boolean,
): Promise<void> {
  for (const variant of variants) {
    const variantFunctions = await createVariantFunction(variant, useBaseline);

    for (const test of tests) {
      const weslSrc = Object.fromEntries(test.files.entries());
      const rootModuleName = test.mainFile;

      // Prefix test name with variant if it's not the default
      const testName =
        variant === "link" ? test.name : `(${variant}) ${test.name}`;

      // no way to pass options to mitata.bench, unfortunately
      mitata.bench(testName, () =>
        variantFunctions.current({ weslSrc, rootModuleName }),
      );

      if (variantFunctions.baseline) {
        mitata.bench("--> baseline " + testName, () =>
          variantFunctions.baseline!({ weslSrc, rootModuleName }),
        );
      }
    }
  }
  mitata.run();
}
