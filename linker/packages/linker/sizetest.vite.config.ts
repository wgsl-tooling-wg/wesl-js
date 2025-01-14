/// <reference types="vitest" />
import { LibraryOptions, defineConfig } from "vite";
import { resolve } from "path";
import { baseViteConfig } from "./base.vite.config.js";
// import { visualizer } from "rollup-plugin-visualizer";

const config = baseViteConfig();
config.build.minify = "terser";
config.build.emptyOutDir = false;
const lib = config.build.lib as LibraryOptions;
lib.fileName = "sized";
lib.entry = [resolve(__dirname, "src/Linker.ts")];

export default defineConfig(config);
