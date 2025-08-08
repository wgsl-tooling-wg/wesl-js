import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { WeslImports } from "./ParserVariations.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** @return path to baseline wesl package */
function baselinePath(): string {
  return resolve(__dirname, "../../../../_baseline/packages/wesl/src/index.ts");
}

/** Exit with error message for baseline issues */
function exitWithError(message: string, error?: unknown): never {
  console.error(`Error: ${message}`);
  if (error) console.error(error);
  else
    console.error(
      "Please ensure the _baseline directory exists as a sibling of the tools directory.",
    );
  process.exit(1);
}

/** @return baseline imports from _baseline directory if requested */
export async function loadBaselineImports(args: {
  baseline?: boolean;
}): Promise<WeslImports | undefined> {
  if (!args.baseline) return undefined;

  const path = baselinePath();
  if (!existsSync(path)) {
    exitWithError(`Baseline directory not found at ${path}`);
  }

  try {
    const baselineModule = await import(path);
    return {
      _linkSync: baselineModule._linkSync,
      parsedRegistry: baselineModule.parsedRegistry,
      parseIntoRegistry: baselineModule.parseIntoRegistry,
      WeslStream: baselineModule.WeslStream,
    };
  } catch (error) {
    exitWithError("Error loading baseline module:", error);
  }
}
