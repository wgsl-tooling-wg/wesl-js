/// <reference types="vitest/config" />
import { LibraryOptions, defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";
// import { visualizer } from "rollup-plugin-visualizer";

const config = baseViteConfig();
config.build.minify = "esbuild";
config.build.emptyOutDir = false;
(config.build.lib as LibraryOptions).fileName = "minified";

export default defineConfig(config);
