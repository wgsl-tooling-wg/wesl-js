import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "tsdown";

/** Handle Vite-style `?inline` CSS imports for tsdown/rolldown. */
const cssInline = {
  name: "css-inline",
  resolveId(id: string, importer?: string) {
    if (!id.endsWith("?inline")) return;
    const base = id.slice(0, -"?inline".length);
    const dir = importer ? dirname(importer) : process.cwd();
    return resolve(dir, base) + "?inline";
  },
  load(id: string) {
    if (!id.endsWith("?inline")) return;
    const path = id.slice(0, -"?inline".length);
    const css = readFileSync(path, "utf-8");
    return `export default ${JSON.stringify(css)};`;
  },
};

export default defineConfig({
  entry: ["src/index.ts", "src/Language.ts", "src/WgslEdit.ts"],
  format: "esm",
  dts: true,
  clean: true,
  plugins: [cssInline],
});
