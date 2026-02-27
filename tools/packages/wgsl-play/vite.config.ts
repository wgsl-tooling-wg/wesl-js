import { defineConfig } from "vite";
import viteWesl from "wesl-plugin/vite";

export default defineConfig({
  plugins: [
    viteWesl({
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
