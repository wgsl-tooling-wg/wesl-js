import { UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { linkBuildPlugin } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

// we use a vite not vitest config for this test, because we're going to
// build and launch a the noTomlMain test driver

const config: UserConfig = {
  plugins: [tsconfigPaths(), viteWesl({ extensions: [linkBuildPlugin] })],
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
