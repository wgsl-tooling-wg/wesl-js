import { defineConfig } from "tsdown";
import { rawImports } from "../../config/RawImports.ts";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/AppearancePicker.ts", "src/jsx-preact.ts"],
    target: "es2024",
    clean: true,
    dts: true,
    platform: "browser",
    deps: { neverBundle: ["preact"], onlyBundle: false },
    plugins: [rawImports()],
    logLevel: "warn",
  },
]);
