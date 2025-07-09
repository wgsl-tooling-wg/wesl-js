/// <reference types="vitest/config" />
import { resolve } from "node:path";
import type { UserConfig } from "vite";
import dts from "vite-plugin-dts";

export function baseViteConfig(): UserConfig {
  return {
    plugins: [
      dts(), // generate .d.ts files
    ],
    build: {
      lib: {
        name: "wgsl-linker",
        entry: [resolve(__dirname, "src/index.ts")],
        formats: ["es"],
      },
      minify: false,
      sourcemap: true,
    },
  };
}
