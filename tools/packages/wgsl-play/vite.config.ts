import { defineConfig } from "vite";
import { linkBuildExtension, staticBuildExtension } from "wesl-plugin";
import viteWesl from "wesl-plugin/vite";

export default defineConfig({
  plugins: [
    viteWesl({
      extensions: [staticBuildExtension, linkBuildExtension],
      // debug: true,
      weslToml: "./test-page/wesl.toml",
    }),
  ],
  server: {
    fs: {
      // Allow serving files from sibling packages for dev mode testing
      allow: [".."],
    },
  },
});
