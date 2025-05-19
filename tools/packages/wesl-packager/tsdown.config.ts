import { defineConfig } from "tsdown";
import rawFileImporter from "./rollup-plugin-raw.ts";

export default defineConfig({
  entry: ["./src/main.ts"],
  target: "node22",
  clean: true,
  platform: "neutral",
  external: ["node:url", "node:process", "node:path", "yargs", "assert", "fs", "path", "util", "url", "wesl", "node:fs/promises"],
  plugins: [
    rawFileImporter() as any, // Cast to any if type incompatibility with tsdown's expected plugin type
  ],
});
