/// <reference types="vitest/config" />
import { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteWesl from "wesl-plugin/vite";

const config: UserConfig = {
  plugins: [tsconfigPaths(), viteWesl()],
  build: {
    // setup build for testing
    lib: {
      entry: ["src/test/testMain.ts"],
      name: "testMain",
      formats: ["cjs"],
    },
    minify: false,
    target: "node23",
    rollupOptions: {
      external: ["module", "node:path", "node:url"], // packages mentioned in webgpu project
    },
  },
};

export default config;
