import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/plugins/*.ts", "src/pluginIndex.ts"],
  clean: true,
  format: ["esm"],
  dts: {
    resolve: [/^wesl-tooling/], // Bundle wesl-tooling types into output
  },
  target: "node22",
  external: ["wesl", "unplugin"],
  logLevel: "warn",
});
