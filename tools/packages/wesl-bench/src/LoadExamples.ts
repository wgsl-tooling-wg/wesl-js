import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface WeslSource {
  weslSrc: Record<string, string>;
  rootModule: string;
  lineCount?: number;
}

/** @return preloaded source data for all benchmark examples */
export function loadExamples(examplesDir: string): Record<string, WeslSource> {
  return {
    bevy: loadDirectory(
      join(examplesDir, "bevy"),
      "./bevy_generated_deferred_lighting.wgsl",
    ),
    import_only: loadFile(examplesDir, "imports_only.wgsl"),
    particle: loadFile(examplesDir, "particle.wgsl"),
    rasterize: loadFile(examplesDir, "rasterize_05_fine.wgsl"),
    reduceBuffer: loadFile(examplesDir, "reduceBuffer.wgsl"),
    unity: loadFile(examplesDir, "unity_webgpu_000002B8376A5020.fs.wgsl"),
  };
}

/** @return source data for all WESL files in a directory */
function loadDirectory(dir: string, rootModule?: string): WeslSource {
  const weslSrc = collectFiles(dir);
  const resolvedRoot = resolveRoot(weslSrc, rootModule, dir);
  const lineCount = totalLines(weslSrc);
  return { weslSrc, rootModule: resolvedRoot, lineCount };
}

/** @return source data for a single WESL file */
function loadFile(basePath: string, filename: string): WeslSource {
  const path = join(basePath, filename);
  const content = readFileSync(path, "utf-8");
  const modulePath = `./${filename}`;
  const weslSrc = { [modulePath]: content };
  const lineCount = totalLines(weslSrc);
  return { weslSrc, rootModule: modulePath, lineCount };
}

/** @return true if file has WESL/WGSL extension */
function isWeslFile(filename: string): boolean {
  return filename.endsWith(".wgsl") || filename.endsWith(".wesl");
}

/** @return tuple of [module path, file content] for a WESL file */
function loadFileEntry(baseDir: string, filePath: string): [string, string] {
  const content = readFileSync(filePath, "utf-8");
  const relativePath = relative(baseDir, filePath);
  return [`./${relativePath}`, content];
}

/** @return module paths to contents for all WESL files in tree */
function collectFiles(dir: string): Record<string, string> {
  const modules: Record<string, string> = {};
  const baseDir = dir;

  function scanDir(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (isWeslFile(entry)) {
        const [modulePath, content] = loadFileEntry(baseDir, fullPath);
        modules[modulePath] = content;
      }
    }
  }

  scanDir(dir);
  return modules;
}

/** @return root module path, defaults to single file */
function resolveRoot(
  weslSrc: Record<string, string>,
  rootModule: string | undefined,
  dir: string,
): string {
  const keys = Object.keys(weslSrc);
  const resolved = rootModule || (keys.length === 1 ? keys[0] : "");
  if (!resolved) {
    throw new Error(
      `Multiple files found but no root module specified for ${dir}`,
    );
  }
  return resolved;
}

/** @return total lines across all source files */
function totalLines(weslSrc: Record<string, string>): number {
  return Object.values(weslSrc).reduce(
    (total, content) => total + content.split("\n").length,
    0,
  );
}
