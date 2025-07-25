import type { Plugin, UserConfig } from "vite";
import { linkBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

// we use a vite not vitest config for this test, because we're going to
// build and launch a the noTomlMain test driver

const config: UserConfig = {
  plugins: [viteWesl({ extensions: [linkBuildExtension] }) as Plugin],
  build: {
    // setup build for test that calls 'vite build'
    lib: {
      entry: ["noTomlMain.ts"],
      name: "noTomlMain",
      formats: ["cjs"],
    },
    minify: false,
    target: "node23",
  },
};

export default config;
