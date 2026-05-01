import { defineConfig } from "tsdown";
import { rawImports } from "../../config/RawImports.ts";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/WgslPlay.ts", "src/jsx-preact.ts"],
    target: "es2024",
    clean: true,
    dts: true,
    platform: "browser",
    deps: { neverBundle: ["preact"], onlyBundle: false },
    plugins: [rawImports()],
    logLevel: "warn",
  },
  {
    entry: { "wgsl-play": "src/index.ts" },
    target: "es2024",
    clean: false,
    platform: "browser",
    deps: { alwaysBundle: [/.*/], onlyBundle: false },
    plugins: [rawImports()],
    logLevel: "warn",
  },
]);
