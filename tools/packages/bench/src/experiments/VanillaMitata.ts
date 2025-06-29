import * as mitata from "mitata";
import { _linkSync, type link } from "wesl";
import type { BenchTest } from "../../bin/bench.ts";

type ParserVariant = "link" | "parse" | "tokenize" | "wgsl_reflect" | "use-gpu";

export async function simpleMitataBench(
  tests: BenchTest[],
  variants: ParserVariant[],
  useBaseline: boolean,
  forEachVariantTest: (
    tests: BenchTest[],
    variants: ParserVariant[],
    useBaseline: boolean,
    callback: (
      test: BenchTest,
      variant: ParserVariant,
      variantFunctions: any,
    ) => Promise<void>,
  ) => Promise<void>,
): Promise<void> {
  await forEachVariantTest(
    tests,
    variants,
    useBaseline,
    async (test, variant, variantFunctions) => {
      const weslSrc = Object.fromEntries(test.files.entries());
      const rootModuleName = test.mainFile;

      // Prefix test name with variant if it's not the default
      const testName =
        variant === "link" ? test.name : `(${variant}) ${test.name}`;

      // no way to pass options to mitata.bench, unfortunately
      mitata.bench(testName, () => 
        variantFunctions.current({ weslSrc, rootModuleName })
      );

      if (variantFunctions.baseline) {
        mitata.bench("--> baseline " + testName, () =>
          variantFunctions.baseline({ weslSrc, rootModuleName }),
        );
      }
    },
  );
  mitata.run();
}
