import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LoadResult, Plugin, PluginContext } from "rollup";

const rawSuffix = "?raw";
// The \\0 prefix is a convention in Rollup to indicate that a module ID is virtual
// or handled by a plugin and should not be resolved by other plugins or the default resolver.
const virtualPrefix = "\\0raw:";

// Get the directory of this plugin file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function rawFileImporter(): Plugin {
  return {
    name: "raw-file-importer",

    resolveId(sourceId: string, importer: string | undefined): string | null {
      if (sourceId.endsWith(rawSuffix)) {
        const actualPath = sourceId.slice(0, -rawSuffix.length);
        // If importer is undefined, it's an entry point or Rollup couldn't determine the importer.
        const baseDir = importer ? path.dirname(importer) : __dirname;
        const resolvedPath = path.resolve(baseDir, actualPath);
        // Convert to relative path from the plugin directory to avoid absolute paths in output
        const relativePath = path.relative(__dirname, resolvedPath);
        return `${virtualPrefix}${relativePath}`;
      }
      return null;
    },

    async load(this: PluginContext, resolvedId: string): Promise<LoadResult> {
      if (resolvedId.startsWith(virtualPrefix)) {
        const relativePath = resolvedId.slice(virtualPrefix.length);
        // Convert relative path back to absolute for file reading
        const absolutePath = path.resolve(__dirname, relativePath);
        try {
          const fileContent = await fs.readFile(absolutePath, "utf-8");
          return {
            code: `export default ${JSON.stringify(fileContent)};`,
            map: { mappings: "" }, // empty sourcemap
          };
        } catch (error) {
          let message = `Failed to load raw file: ${absolutePath}`;
          if (error instanceof Error) {
            message = error.message;
          }
          this.error(message); // Use Rollup's plugin context to throw an error
        }
      }
      return null;
    },
  };
}
