/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import viteWesl from "wesl-plugin/vite";
import { bindingLayoutExtension } from "../plugin/src/BindingLayoutExtension.js";
import { linkBuildPlugin } from "../plugin/src/LinkExtension.js";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");

const config: UserConfig = {
  plugins: [
    tsconfigPaths(),
    viteWesl({
      weslToml,
      buildPlugins: [linkBuildPlugin, bindingLayoutExtension],
    }),
  ],
  build: {
    // setup build for test that calls 'vite build'
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
