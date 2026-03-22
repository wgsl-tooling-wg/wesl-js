import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/plugins/*.ts", "src/pluginIndex.ts"],
  clean: true,
  format: ["esm"],
  dts: true,
  target: "node22",
  deps: { neverBundle: ["wesl", "unplugin"], onlyBundle: false },
  logLevel: "warn",
});
