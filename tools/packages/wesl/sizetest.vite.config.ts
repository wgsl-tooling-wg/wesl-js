import { resolve } from "node:path";
import { defineConfig, type LibraryOptions } from "vite";
import { baseViteConfig } from "./base.vite.config.ts";

const config = baseViteConfig();
config.build!.minify = "terser";
config.build!.emptyOutDir = false;
const lib = config.build!.lib as LibraryOptions;
lib.fileName = "sized";
lib.entry = [resolve(__dirname, "src/Linker.ts")];
lib.formats = ["cjs"];

export default defineConfig(config);
