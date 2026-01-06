/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// V1-specific tests to exclude (V1 parser has been removed)
const v1OnlyTests = [
  "**/ScopeWESL.test.ts",
  "**/BindWESL.test.ts",
  "**/ParseWESL.test.ts",
  "**/ParseConditions.test.ts",
  "**/ParseElif.test.ts",
  "**/ParseError.test.ts",
  "**/Reflection.test.ts",
  "**/TransformBindingStructs.test.ts",
  "**/ParserV2Parity.test.ts", // compares V1 and V2, no longer needed
  "**/CompareV1V2.test.ts", // compares V1 and V2, no longer needed
  "**/ImportSyntaxCases.test.ts", // tests V1 combinators directly
  "**/Expression.test.ts", // tests V1 combinators directly
];

export default defineConfig({
  test: {
    setupFiles: "./src/test/TestSetup.ts",
    include: ["src/test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", ...v1OnlyTests],
  },
});
