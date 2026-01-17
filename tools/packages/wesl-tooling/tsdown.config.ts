import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  target: "node22",
  clean: true,
  dts: true,
  platform: "neutral",
  external: [
    "wesl",
    "glob",
    "import-meta-resolve",
    "toml",
    "node:fs",
    "node:fs/promises",
    "node:path",
    "node:url",
  ],
  logLevel: "warn",
});
