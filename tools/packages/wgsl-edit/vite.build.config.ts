import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/WgslEdit.ts"),
      formats: ["es"],
      fileName: "wgsl-edit",
    },
    outDir: "dist",
  },
});
