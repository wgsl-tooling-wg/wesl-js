import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import viteWesl from "wesl-plugin/vite";

const thisPath = fileURLToPath(import.meta.url);
const weslToml = path.join(path.dirname(thisPath), "wesl.toml");

export default defineConfig({
  plugins: [viteWesl({ weslToml }) as Plugin],
});
