/// <reference types="vitest/config" />
import { LibraryOptions, defineConfig } from "vite";
import { resolve } from "path";
import { baseViteConfig } from "./base.vite.config.js";

const config = baseViteConfig();
config.build.minify = "terser";
config.build.emptyOutDir = false;
const lib = config.build.lib as LibraryOptions;
lib.fileName = "sized";
lib.entry = [resolve(__dirname, "src/Linker.ts")];

export default defineConfig(config);
