import { resolve } from "node:path";
/// <reference types="vitest/config" />
import replace from "@rollup/plugin-replace";
import { defineConfig, type LibraryOptions } from "vite";
import { baseViteConfig } from "./base.vite.config.ts";

const config = baseViteConfig();
config.build!.minify = "terser";
config.build!.emptyOutDir = false;
config.plugins = [
  ...(config.plugins || []),
  // emulate a future prod build with less logging/validation
  replace({
    preventAssignment: true,
    values: {
      "const debug = true": "const debug = false",
      "const validation = true": "const validation = false",
    },
  }),
];
const lib = config.build!.lib as LibraryOptions;
lib.fileName = "sized";
lib.entry = [resolve(__dirname, "src/Linker.ts")];
lib.formats = ["cjs"];

export default defineConfig(config);
