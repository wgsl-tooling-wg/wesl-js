/// <reference types="vitest/config" />
import { LibraryOptions, defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";
import { resolve } from "path";

const config = baseViteConfig();
config.build.emptyOutDir = false;
const lib = config.build.lib as LibraryOptions;
lib.name = "mini-parse-vitest-util";
lib.formats = ["es"];
lib.entry = [resolve(__dirname, "./src/vitest-util/index.ts")];
lib.fileName = "vitestUtil";

export default defineConfig(config);