import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/main.ts"],
  format: "esm",
  target: "node22",
  clean: true,
  dts: false,
  sourcemap: true,
  platform: "node",
  external: [
    "@biomejs/js-api",
    "@biomejs/wasm-nodejs",
    "wesl",
    "wesl-tooling",
    "yargs",
    "yargs/helpers",
  ],
  logLevel: "warn",
});
