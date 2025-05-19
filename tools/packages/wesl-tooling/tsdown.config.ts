import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  target: "node22",
  clean: true,
  dts: true,
  platform: "neutral",
  external: ["node:url", "node:path", "wesl"],
});
