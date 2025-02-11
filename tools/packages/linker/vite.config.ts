/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.js";

const config = baseViteConfig();
export default defineConfig(config);
