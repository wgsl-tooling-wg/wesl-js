import { readFileSync } from "node:fs";
import preact from "@preact/preset-vite";
import { defineConfig, type Plugin } from "vite";
import viteWesl from "wesl-plugin/vite";

const wgslPlayPkg = JSON.parse(
  readFileSync(new URL("../wgsl-play/package.json", import.meta.url), "utf-8"),
);

export default defineConfig({
  plugins: [preact(), viteWesl() as Plugin],
  define: {
    __WGSL_PLAY_VERSION__: JSON.stringify(wgslPlayPkg.version),
  },
  build: {
    outDir: "dist",
    target: "es2024",
    emptyOutDir: true,
  },
  server: {
    fs: { allow: [".."] },
  },
});
