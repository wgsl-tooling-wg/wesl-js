import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/extension.ts"],
    clean: true,
    format: ["esm"],
    target: "node22",
    external: ["vscode", "webgpu"],
    noExternal: [/.*/], // bundle workspace deps for vsce
    outDir: "dist",
    logLevel: "warn",
  },
  {
    entry: ["src/webview/main.ts"],
    clean: false, // first build already cleaned dist/
    format: ["esm"],
    target: "esnext",
    outDir: "dist/webview",
    logLevel: "warn",
    noExternal: [/.*/], // bundle everything for browser context
  },
  {
    // standalone CLI for running tests in a subprocess (spawned by WeslTestController)
    entry: ["src/runTestCli.ts"],
    clean: false,
    format: ["esm"],
    target: "node22",
    external: ["webgpu"],
    noExternal: [/.*/],
    outDir: "dist",
    logLevel: "warn",
  },
  {
    entry: ["src/test/extension.test.ts"],
    clean: false,
    format: ["cjs"], // mocha requires cjs
    target: "node22",
    external: ["vscode", "mocha"],
    outDir: "dist/test",
    logLevel: "warn",
  },
]);
