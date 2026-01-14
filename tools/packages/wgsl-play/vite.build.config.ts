import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/WgslPlay.ts"),
      formats: ["es"],
      fileName: "wgsl-play",
    },
    outDir: "dist",
    // Bundle all dependencies for browser
    rollupOptions: {
      output: {
        // Single file output
        inlineDynamicImports: true,
      },
    },
  },
});
