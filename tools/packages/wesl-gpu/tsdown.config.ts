import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  target: "es2022",
  clean: true,
  dts: true,
  platform: "browser",
  external: ["wesl", "thimbleberry"],
  logLevel: "warn",
});
