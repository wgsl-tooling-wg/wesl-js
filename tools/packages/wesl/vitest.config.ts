/// <reference types="vitest/config" />
import { mergeConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";
// import { visualizer } from "rollup-plugin-visualizer";

const merged = mergeConfig(baseViteConfig(), {
  test: {
    setupFiles: "./src/test/TestSetup.ts",
  },
});

export default merged;
