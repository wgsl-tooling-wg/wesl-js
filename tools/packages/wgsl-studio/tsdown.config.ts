import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/extension.ts"],
    clean: true,
    format: ["esm"],
    target: "node22",
    external: ["vscode"],
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
]);
