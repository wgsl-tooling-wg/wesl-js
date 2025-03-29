/// <reference types="vitest" />
import { defineConfig, type UserConfig } from "vite";
import dts from "vite-plugin-dts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const config: UserConfig = {
  plugins: [
    dts({
      tsconfigPath: "./tsconfig.vite.json",
    }),
  ],
  build: {
    lib: {
      name: "mini-parse",
      entry: [resolve(__dirname, "mod.ts")],
      formats: ["es"],
    },
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: [
        "vite.config.ts",
      ],
    },
  },
};

export default defineConfig(config);
