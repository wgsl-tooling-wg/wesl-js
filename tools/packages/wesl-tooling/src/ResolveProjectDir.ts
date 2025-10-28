import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Resolves a project directory by searching upward for package.json or wesl.toml.
 *
 * @param startPath - Optional starting path (file:// URL or filesystem path).
 *   If a file URL is provided, uses its directory.
 *   If omitted or falsy, defaults to process.cwd().
 * @returns file:// URL string pointing to the project directory
 *   (the first ancestor containing package.json or wesl.toml, or the start directory)
 */
export async function resolveProjectDir(startPath?: string): Promise<string> {
  let dir: string;

  if (!startPath) {
    dir = process.cwd();
  } else if (startPath.startsWith("file://")) {
    // Convert file:// URL to path, then get its directory
    const fsPath = fileURLToPath(startPath);
    dir = (await isFile(fsPath)) ? path.dirname(fsPath) : fsPath;
  } else {
    // Treat as filesystem path
    dir = (await isFile(startPath)) ? path.dirname(startPath) : startPath;
  }

  // Search upward for package.json or wesl.toml
  let current = path.resolve(dir);
  while (true) {
    const hasPkgJson = await fileExists(path.join(current, "package.json"));
    const hasWeslToml = await fileExists(path.join(current, "wesl.toml"));

    if (hasPkgJson || hasWeslToml) {
      return pathToFileURL(current).href;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding package.json or wesl.toml
      // Return the original dir as file:// URL
      return pathToFileURL(dir).href;
    }
    current = parent;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isFile(fsPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(fsPath);
    return stat.isFile();
  } catch {
    return false;
  }
}
