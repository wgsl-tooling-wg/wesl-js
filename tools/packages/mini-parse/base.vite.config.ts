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
        name: "mini-parse",
        entry: [resolve(__dirname, "src/index.ts")],
        formats: ["es"],
      },
      minify: false,
      sourcemap: true,
    },
  };
}
