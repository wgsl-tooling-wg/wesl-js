import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts", "src/reporter.ts"],
  target: "node22",
  clean: true,
  dts: true,
  platform: "neutral",
  external: [
    "node:child_process",
    "node:fs",
    "node:fs/promises",
    "node:http",
    "node:path",
    "node:url",
    "vitest",
    "vitest/node",
  ],
  logLevel: "warn",
  copy: "src/templates",
});
