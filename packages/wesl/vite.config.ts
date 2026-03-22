/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { baseViteConfig } from "./base.vite.config.ts";

const config = baseViteConfig();
export default defineConfig(config);
