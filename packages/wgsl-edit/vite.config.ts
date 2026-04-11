import { defineConfig } from "vite";
import viteWesl from "wesl-plugin/vite";
import wgslEditAutosave from "./src/autosave.ts";

export default defineConfig({
  build: {
    outDir: "../site",
    emptyOutDir: true,
  },
  plugins: [
    viteWesl({ weslToml: import.meta.dirname + "/demo/wesl.toml" }),
    wgslEditAutosave(),
  ],
  server: {
    fs: { allow: [".."] },
  },
});
