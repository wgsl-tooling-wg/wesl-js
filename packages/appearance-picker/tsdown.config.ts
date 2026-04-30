import { defineConfig } from "tsdown";
import { rawImports } from "../../config/RawImports.ts";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/AppearancePicker.ts"],
    target: "es2024",
    clean: true,
    dts: true,
    platform: "browser",
    plugins: [rawImports()],
    logLevel: "warn",
  },
]);
