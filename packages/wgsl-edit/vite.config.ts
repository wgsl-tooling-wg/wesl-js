import { defineConfig } from "vite";
import viteWesl from "wesl-plugin/vite";
import wgslEditAutosave from "./src/autosave.ts";

export default defineConfig({
  build: {
    outDir: "../site",
    emptyOutDir: true,
  },
  plugins: [viteWesl(), wgslEditAutosave()],
  server: {
    fs: { allow: [".."] },
  },
});
