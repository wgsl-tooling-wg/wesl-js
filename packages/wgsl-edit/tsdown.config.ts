import { defineConfig } from "tsdown";
import { rawImports } from "../../config/RawImports.ts";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/WgslEdit.ts", "src/Language.ts"],
    target: "es2024",
    clean: true,
    dts: true,
    platform: "browser",
    plugins: [rawImports()],
    logLevel: "warn",
  },
  {
    entry: { "wgsl-edit": "src/index.ts" },
    target: "es2024",
    clean: false,
    platform: "browser",
    deps: { alwaysBundle: [/.*/], onlyBundle: false },
    plugins: [rawImports()],
    logLevel: "warn",
  },
  {
    entry: ["src/autosave.ts", "src/SaveMiddleware.ts", "src/SaveEndpoint.ts"],
    target: "node22",
    clean: false,
    dts: true,
    platform: "node",
    format: ["esm"],
    deps: { neverBundle: ["vite"], onlyBundle: false },
    logLevel: "warn",
  },
]);
