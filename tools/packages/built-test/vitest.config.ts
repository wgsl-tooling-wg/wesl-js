/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import type { ViteUserConfig } from "vitest/config";
import viteWesl from "wesl-plugin/vite";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");

// In temp-built-test, add the image snapshot reporter
const inBuiltTest = process.cwd().endsWith("temp-built-test");
const reporters: string[] = inBuiltTest
  ? ["default", "vitest-image-snapshot/reporter"]
  : ["default"];

const config: ViteUserConfig = {
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/temp-packages/**"],
    reporters,
  },
  plugins: [viteWesl({ weslToml }) as Plugin],
};

export default config;
