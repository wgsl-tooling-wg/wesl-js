/// <reference types="vitest" />
import { defineConfig, type LibraryOptions } from "vite";
import { baseViteConfig } from "./base.vite.config.js";

const config = baseViteConfig();
(config.build!.lib as LibraryOptions).name = "mini-parse";

export default defineConfig(config);
