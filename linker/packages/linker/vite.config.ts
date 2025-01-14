/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";
// import { visualizer } from "rollup-plugin-visualizer";

const config = baseViteConfig();
export default defineConfig(config);
