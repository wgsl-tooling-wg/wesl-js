/// <reference types="vitest/config" />
import { type LibraryOptions, defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";

const config = baseViteConfig();
config.build!.minify = "esbuild";
config.build!.emptyOutDir = false;
(config.build!.lib as LibraryOptions).fileName = "minified";

export default defineConfig(config);
