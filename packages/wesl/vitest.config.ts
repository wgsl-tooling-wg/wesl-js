/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    setupFiles: "./src/test/TestSetup.ts",
    include: ["src/test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
