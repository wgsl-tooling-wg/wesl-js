import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  target: "es2022",
  clean: true,
  dts: true,
  platform: "browser",
  deps: { neverBundle: ["wesl"] },
  logLevel: "warn",
});
