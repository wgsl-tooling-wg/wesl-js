import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  target: "node22",
  clean: true,
  dts: true,
  sourcemap: true,
  platform: "neutral",
  external: [
    "module",
    "node:assert",
    "node:fs",
    "node:fs/promises",
    "node:module",
    "node:path",
    "node:process",
    "node:url",
    "node:util",
    "node:v8",
    "wesl",
  ],
  logLevel: "warn",
});
