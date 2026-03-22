import { defineConfig } from "tsdown";

const sharedNeverBundle = [
  "../lib/weslBundle.js",
  "fs",
  "module",
  "node:assert",
  "node:events",
  "node:fs",
  "node:fs/promises",
  "node:module",
  "node:path",
  "node:process",
  "node:stream",
  "node:string_decoder",
  "node:url",
  "node:util",
  "node:v8",
  "pngjs",
  "thimbleberry",
  "vitest",
  "vitest-image-snapshot",
];

export default defineConfig([
  {
    entry: ["./src/index.ts", "./src/wgslTestMain.ts"],
    target: "node22",
    clean: true,
    dts: true,
    sourcemap: true,
    platform: "neutral",
    deps: {
      neverBundle: [...sharedNeverBundle, "wesl", "wesl-gpu", "wesl-tooling"],
    },
    logLevel: "warn",
  },
  {
    // self-contained CLI for embedding in wgsl-studio extension
    entry: ["./src/runTestCli.ts"],
    target: "node22",
    clean: false,
    sourcemap: true,
    platform: "neutral",
    deps: {
      neverBundle: sharedNeverBundle,
      alwaysBundle: [/.*/], // bundle workspace deps (wesl, wesl-gpu, wesl-tooling)
      onlyBundle: false,
    },
    logLevel: "warn",
  },
]);
