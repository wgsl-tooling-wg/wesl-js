/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    setupFiles: "./src/test/TestSetup.ts",
    include: ["src/test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  resolve: {
    alias: { wesl: resolve(__dirname, "dist-nodebug/index.js") },
  },
});
