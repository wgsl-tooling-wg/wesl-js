import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/main.ts"],
  format: "esm",
  target: "node22",
  clean: true,
  dts: false,
  sourcemap: true,
  platform: "node",
  deps: {
    neverBundle: [
      "import-meta-resolve",
      "wesl",
      "wesl-tooling",
      "yargs",
      "yargs/helpers",
    ],
  },
  logLevel: "warn",
});
