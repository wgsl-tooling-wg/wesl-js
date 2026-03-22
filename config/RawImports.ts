import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const suffixes = ["?inline", "?raw"];

/** Handle Vite-style `?inline` and `?raw` imports by reading files as text. */
export function rawImports() {
  return {
    name: "raw-imports",
    resolveId(source: string, importer: string | undefined) {
      const suffix = suffixes.find(s => source.endsWith(s));
      if (suffix && importer) {
        const filePath = source.slice(0, -suffix.length);
        return resolve(dirname(importer), filePath) + suffix;
      }
    },
    load(id: string) {
      const suffix = suffixes.find(s => id.endsWith(s));
      if (suffix) {
        const content = readFileSync(id.slice(0, -suffix.length), "utf8");
        return `export default ${JSON.stringify(content)};`;
      }
    },
  };
}
