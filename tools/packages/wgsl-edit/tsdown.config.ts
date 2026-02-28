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
    noExternal: [/.*/],
    plugins: [rawImports()],
    logLevel: "warn",
  },
]);
