/// <reference types="vitest/config" />
import { LibraryOptions, defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";
import { resolve } from "path";

const config = baseViteConfig();
config.build.emptyOutDir = false;
const lib = config.build.lib as LibraryOptions;
lib.name = "mini-parse-test-util";
lib.formats = ["es"];
lib.entry = [resolve(__dirname, "./src/test-util/index.ts")];
lib.fileName = "testUtil";

export default defineConfig(config);
