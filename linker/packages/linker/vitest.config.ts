/// <reference types="vitest/config" />
import { mergeConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";
// import { visualizer } from "rollup-plugin-visualizer";

const aliasPath = new URL("../../../wesl-testsuite", import.meta.url).pathname;

const merged = mergeConfig(baseViteConfig(), {
  test: {
    setupFiles: "./src/test/TestSetup.ts",
  },
  resolve: {
    // so vitest reruns when tests change
    alias: { "wesl-testsuite": aliasPath },
  },
});

export default merged;
