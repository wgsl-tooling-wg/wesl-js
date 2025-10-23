import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  target: "node22",
  clean: true,
  dts: true,
  platform: "neutral",
  external: [
    "node:child_process",
    "node:fs",
    "node:fs/promises",
    "node:path",
    "node:url",
    "vitest",
    "vitest/node",
  ],
  logLevel: "warn",
});
