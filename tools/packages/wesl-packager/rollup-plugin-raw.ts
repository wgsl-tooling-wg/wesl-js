import fs from 'node:fs/promises';
import path from 'node:path';
import type { LoadResult, Plugin, PluginContext } from 'rollup';

const rawSuffix = '?raw';
// The \\0 prefix is a convention in Rollup to indicate that a module ID is virtual
// or handled by a plugin and should not be resolved by other plugins or the default resolver.
const virtualPrefix = '\\0raw:';

export default function rawFileImporter(): Plugin {
  return {
    name: 'raw-file-importer',

    resolveId(sourceId: string, importer: string | undefined): string | null {
      if (sourceId.endsWith(rawSuffix)) {
        const actualPath = sourceId.slice(0, -rawSuffix.length);
        // If importer is undefined, it's an entry point or Rollup couldn't determine the importer.
        const baseDir = importer ? path.dirname(importer) : process.cwd();
        const resolvedPath = path.resolve(baseDir, actualPath);
        return `${virtualPrefix}${resolvedPath}`;
      }
      return null;
    },

    async load(this: PluginContext, resolvedId: string): Promise<LoadResult> {
      if (resolvedId.startsWith(virtualPrefix)) {
        const actualPath = resolvedId.slice(virtualPrefix.length);
        try {
          const fileContent = await fs.readFile(actualPath, 'utf-8');
          return {
            code: `export default ${JSON.stringify(fileContent)};`,
            map: { mappings: '' } // empty sourcemap
          };
        } catch (error) {
          let message = `Failed to load raw file: ${actualPath}`;
          if (error instanceof Error) {
            message = error.message;
          }
          this.error(message); // Use Rollup's plugin context to throw an error
        }
      }
      return null;
    }
  };
}
