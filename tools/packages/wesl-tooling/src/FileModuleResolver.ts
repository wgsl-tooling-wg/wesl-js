import * as fs from "node:fs";
import type { ModuleResolver, WeslAST } from "wesl";
import { parseSrcModule } from "wesl";

/**
 * Loads WESL modules from the filesystem on demand with caching.
 *
 * Resolves module paths like `package::foo::bar` to filesystem paths
 * like `baseDir/foo/bar.wesl` or `baseDir/foo/bar.wgsl`.
 *
 * @example
 * ```ts
 * const resolver = new FileModuleResolver("./shaders", "my-package");
 * const ast = resolver.resolveModule("package::utils::helper");
 * ```
 */
export class FileModuleResolver implements ModuleResolver {
  /** Cached parsed ASTs to avoid re-parsing the same module */
  readonly astCache = new Map<string, WeslAST>();

  /** Root directory containing shader source files */
  readonly baseDir: string;

  /** Package name that this resolver handles (in addition to generic "package") */
  readonly packageName: string;

  /** Optional root path for debug file paths (for browser-clickable errors) */
  readonly debugWeslRoot?: string;

  /**
   * @param baseDir - Root directory containing shader source files
   * @param packageName - Package name to resolve (defaults to "package")
   * @param debugWeslRoot - Optional root path for debug file paths. If provided, error messages
   *   will show paths relative to this root (e.g., "shaders/foo.wesl") instead of absolute
   *   filesystem paths. This is needed for clickable errors in browser dev tools.
   */
  constructor(
    baseDir: string,
    packageName = "package",
    debugWeslRoot?: string,
  ) {
    this.baseDir = baseDir;
    this.packageName = packageName;
    this.debugWeslRoot = debugWeslRoot;
  }

  /**
   * Resolves and parses a module by its import path.
   *
   * Returns cached AST if available, otherwise loads from filesystem,
   * parses, caches, and returns the AST. Returns undefined if module
   * cannot be found.
   *
   * @param modulePath - Module path like "package::foo::bar"
   * @returns Parsed AST or undefined if module not found
   */
  resolveModule(modulePath: string): WeslAST | undefined {
    const cached = this.astCache.get(modulePath);
    if (cached) return cached;

    const sourceFile = this.tryExtensions(modulePath);
    if (!sourceFile) return undefined;

    const debugFilePath = this.debugWeslRoot
      ? this.modulePathToDebugPath(modulePath)
      : sourceFile.filePath;

    const ast = parseSrcModule({
      modulePath,
      debugFilePath,
      src: sourceFile.source,
    });
    this.astCache.set(modulePath, ast);
    return ast;
  }

  /** Try .wesl first, then .wgsl */
  private tryExtensions(modulePath: string) {
    const basePath = this.moduleToFilePath(modulePath);
    if (!basePath) return undefined;

    for (const ext of [".wesl", ".wgsl"]) {
      const filePath = basePath + ext;
      const source = this.loadSource(filePath);
      if (source) return { filePath, source };
    }
    return undefined;
  }

  private loadSource(filePath: string): string | undefined {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch {
      return undefined;
    }
  }

  /** Convert module path (package::foo::bar) to filesystem path (baseDir/foo/bar) */
  private moduleToFilePath(modulePath: string): string | undefined {
    const parts = modulePath.split("::");
    const isOurPackage =
      parts[0] === "package" || parts[0] === this.packageName;
    if (!isOurPackage) return undefined;

    const relativePath = parts.slice(1).join("/");
    return `${this.baseDir}/${relativePath}`;
  }

  /** Convert module path to debug path for error messages */
  private modulePathToDebugPath(modulePath: string): string {
    const parts = modulePath.split("::");
    const relativePath = parts.slice(1).join("/");
    const root = normalizeDebugRoot(this.debugWeslRoot);
    return root + relativePath + ".wesl";
  }
}

/** Normalize debugWeslRoot to ensure it ends with / or is empty */
function normalizeDebugRoot(debugWeslRoot?: string): string {
  if (debugWeslRoot === undefined) return "./";
  if (debugWeslRoot === "") return "";
  return debugWeslRoot.endsWith("/") ? debugWeslRoot : debugWeslRoot + "/";
}
