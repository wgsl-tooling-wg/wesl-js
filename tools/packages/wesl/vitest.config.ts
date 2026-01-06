/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// Check parser mode from environment variable
// - V1_ONLY=true: Run only V1 tests
// - V2_ONLY=true: Run only V2 tests
// - Default: Run both V1 and V2 tests
const useV1Only = process.env.V1_ONLY === "true";
const useV2Only = process.env.V2_ONLY === "true";

// V2-specific tests that should only run in V2 mode
const v2OnlyTests = [
  "**/ParserV2Parity.test.ts",
  "**/ImportCasesV2.test.ts",
  "**/LinkerV2.test.ts",
  "**/ScopeWESLV2.test.ts",
  "**/BindWESLV2.test.ts",
  "**/ParseWeslV2.test.ts",
  "**/CompareV1V2.test.ts",
  "**/DebugImportBinding.test.ts",
  "**/ParseContext.test.ts",
  "**/ParseConditionsV2.test.ts", // V2 AST structure snapshots
  "**/ParseElifV2.test.ts", // V2 AST structure snapshots
  "**/ParseErrorV2.test.ts", // V2 error message snapshots
];

// V1-specific tests that validate V1 AST structure (should not run in V2 mode)
const v1OnlyTests = [
  "**/ScopeWESL.test.ts",
  "**/BindWESL.test.ts",
  "**/ParseWESL.test.ts", // TODO: Update snapshots when V2 is feature-complete
  "**/ParseConditions.test.ts", // V1 AST structure snapshots
  "**/ParseElif.test.ts", // V1 AST structure snapshots
  "**/ParseError.test.ts", // V1 AST structure snapshots
  "**/Reflection.test.ts", // V1 AST structure snapshots
  "**/TransformBindingStructs.test.ts", // V1 AST structure snapshots
];

const baseExcludes = ["**/node_modules/**", "**/dist/**"];

type VitestConfig = ReturnType<typeof defineConfig> extends infer R ? R : never;
let config: VitestConfig;
if (useV1Only) {
  // V1 only mode - exclude V2-specific tests
  config = {
    test: {
      setupFiles: "./src/test/TestSetupV1.ts",
      include: ["src/test/**/*.test.ts"],
      exclude: [...baseExcludes, ...v2OnlyTests],
    },
  };
} else if (useV2Only) {
  // V2 only mode - exclude V1-specific tests
  config = {
    test: {
      setupFiles: "./src/test/TestSetupV2.ts",
      include: ["src/test/**/*.test.ts"],
      exclude: [...baseExcludes, ...v1OnlyTests],
    },
  };
} else {
  // Default: V2 parser mode for wesl package tests
  // (Global default is V1, but wesl package tests default to V2)
  // Excludes V1-specific tests that check V1 AST structure
  config = {
    test: {
      setupFiles: "./src/test/TestSetupV2.ts",
      include: ["src/test/**/*.test.ts"],
      exclude: [...baseExcludes, ...v1OnlyTests],
    },
  };
}

export default defineConfig(config);
