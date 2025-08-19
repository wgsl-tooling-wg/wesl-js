import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
