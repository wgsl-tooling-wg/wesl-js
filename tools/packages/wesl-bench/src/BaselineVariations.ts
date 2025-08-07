import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { WeslImports } from "./ParserVariations.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
/** Load baseline imports from _baseline directory if requested */
export async function loadBaselineImports(args: {
  baseline?: boolean;
}): Promise<WeslImports | undefined> {
  if (!args.baseline) return undefined;

  const baselinePath = resolve(
    __dirname,
    "../../../../_baseline/packages/wesl/src/index.ts",
  );

  if (!existsSync(baselinePath)) {
    console.error(`Error: Baseline directory not found at ${baselinePath}`);
    console.error(
      "Please ensure the _baseline directory exists as a sibling of the tools directory.",
    );
    process.exit(1);
  }

  try {
    const baselineModule = await import(baselinePath);
    const imports: WeslImports = {
      _linkSync: baselineModule._linkSync,
      parsedRegistry: baselineModule.parsedRegistry,
      parseIntoRegistry: baselineModule.parseIntoRegistry,
      WeslStream: baselineModule.WeslStream,
    };
    return imports;
  } catch (error) {
    console.error("Error loading baseline module:", error);
    process.exit(1);
  }
}
