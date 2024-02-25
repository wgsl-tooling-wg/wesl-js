/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import dts from "vite-plugin-dts";
// import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    dts(), // generate
    // visualizer({ brotliSize: true, gzipSize: true }), // generate stats.html size report
  ],
  build: {
    emptyOutDir: false, 
    lib: {
      name: "mini-parse-testing",
      formats: ["es"],
      entry: [resolve(__dirname, "./src/test-util/testUtil.ts")],
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vitest', 'mini-parse'],
    },
    minify: false,
    sourcemap: true,
  },
});
