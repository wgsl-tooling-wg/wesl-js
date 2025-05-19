/// <reference types="vitest" />
import { type LibraryOptions, defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";

const config = baseViteConfig();
// config.test = { setupFiles: "./src/test/TestSetup.ts" };
(config.build.lib as LibraryOptions).name = "mini-parse";

export default defineConfig(config);
