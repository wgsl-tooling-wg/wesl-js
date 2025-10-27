import { parseSrcModule, type WeslAST } from "./ParseWESL.ts";
import { normalize, noSuffix } from "./PathUtil.ts";
import type { WeslBundle } from "./WeslBundle.ts";

const libRegex = /^lib\.w[eg]sl$/i;

/**
 * Resolves module paths to parsed ASTs.
 *
 * Implementations may cache ASTs or load them lazily.
 */
export interface ModuleResolver {
  /**
   * Resolve a module path to its parsed AST.
   *
   * @param modulePath - Module path in :: format (e.g., "package::foo::bar")
   * @returns Parsed AST or undefined if module not found
   */
  resolveModule(modulePath: string): WeslAST | undefined;
}

/** Module resolver that supports batch enumeration of all modules. */
export interface BatchModuleResolver extends ModuleResolver {
  /**
   * Return all modules, parsing them on-demand if needed.
   * Implementations should ensure all sources are parsed before returning.
   */
  allModules(): Iterable<[string, WeslAST]>;
}

export interface RecordResolverOptions {
  /** Package name for module path resolution (default: "package") */
  packageName?: string;
  /** Debug path prefix for error messages */
  debugWeslRoot?: string;
}

/** Module resolver for in-memory source records. Lazy by default. */
export class RecordResolver implements BatchModuleResolver {
  readonly astCache = new Map<string, WeslAST>();
  readonly sources: Record<string, string>;
  readonly packageName: string;
  readonly debugWeslRoot: string;

  constructor(
    sources: Record<string, string>,
    options: RecordResolverOptions = {},
  ) {
    const { packageName = "package", debugWeslRoot } = options;
    this.sources = sources;
    this.packageName = packageName;
    this.debugWeslRoot = normalizeDebugRoot(debugWeslRoot);
  }

  resolveModule(modulePath: string): WeslAST | undefined {
    const cached = this.astCache.get(modulePath);
    if (cached) return cached;

    const source = this.findSource(modulePath);
    if (!source) return undefined;

    const debugFilePath = this.modulePathToDebugPath(modulePath);

    const ast = parseSrcModule({
      modulePath,
      debugFilePath,
      src: source,
    });
    this.astCache.set(modulePath, ast);
    return ast;
  }

  private findSource(modulePath: string): string | undefined {
    if (this.sources[modulePath]) return this.sources[modulePath];

    const filePath = this.moduleToFilePath(modulePath);
    return findInVariants(this.sources, filePath);
  }

  private moduleToFilePath(modulePath: string): string {
    const parts = modulePath.split("::");
    if (parts[0] !== this.packageName && parts[0] !== "package") {
      return modulePath;
    }

    const pathParts = parts.slice(1);
    return pathParts.join("/");
  }

  private modulePathToDebugPath(modulePath: string): string {
    const filePath = this.moduleToFilePath(modulePath);
    return this.debugWeslRoot + filePath + ".wesl";
  }

  /** Return all modules, parsing them on-demand if needed. */
  allModules(): Iterable<[string, WeslAST]> {
    for (const filePath of Object.keys(this.sources)) {
      const modulePath = fileToModulePath(
        filePath,
        this.packageName,
        this.packageName !== "package",
      );
      this.resolveModule(modulePath);
    }
    return this.astCache.entries();
  }
}

/** Composite resolver that tries each resolver in order until one succeeds. */
export class CompositeResolver implements ModuleResolver {
  readonly resolvers: ModuleResolver[];

  constructor(resolvers: ModuleResolver[]) {
    this.resolvers = resolvers;
  }

  resolveModule(modulePath: string): WeslAST | undefined {
    for (const resolver of this.resolvers) {
      const ast = resolver.resolveModule(modulePath);
      if (ast) return ast;
    }
    return undefined;
  }
}

/** Lazy resolver for WeslBundle library modules. */
export class BundleResolver implements ModuleResolver {
  private readonly astCache = new Map<string, WeslAST>();
  private readonly sources: Record<string, string>;
  private readonly packageName: string;
  private readonly debugWeslRoot: string;

  constructor(bundle: WeslBundle, debugWeslRoot?: string) {
    this.sources = bundle.modules;
    this.packageName = bundle.name;
    this.debugWeslRoot = normalizeDebugRoot(debugWeslRoot);
  }

  resolveModule(modulePath: string): WeslAST | undefined {
    if (
      modulePath !== this.packageName &&
      !modulePath.startsWith(this.packageName + "::")
    ) {
      return undefined;
    }

    const cached = this.astCache.get(modulePath);
    if (cached) return cached;

    const source = this.findSource(modulePath);
    if (!source) return undefined;

    const debugFilePath = this.modulePathToDebugPath(modulePath);
    const ast = parseSrcModule({
      modulePath,
      debugFilePath,
      src: source,
    });
    this.astCache.set(modulePath, ast);
    return ast;
  }

  private findSource(modulePath: string): string | undefined {
    const filePath = this.moduleToFilePath(modulePath);

    // Package root resolves to lib.wesl or lib.wgsl
    if (modulePath === this.packageName) {
      const libSrc = findInVariants(this.sources, "lib", ["wesl", "wgsl"]);
      if (libSrc) return libSrc;
    }

    return findInVariants(this.sources, filePath);
  }

  private moduleToFilePath(modulePath: string): string {
    const parts = modulePath.split("::");
    if (parts[0] !== this.packageName) {
      return modulePath;
    }
    return parts.slice(1).join("/");
  }

  private modulePathToDebugPath(modulePath: string): string {
    const filePath = this.moduleToFilePath(modulePath);
    return this.debugWeslRoot + this.packageName + "/" + filePath + ".wesl";
  }
}

/** Convert file path to module path (e.g., "foo/bar.wesl" -> "package::foo::bar"). */
function fileToModulePath(
  filePath: string,
  packageName: string,
  treatLibAsRoot: boolean,
): string {
  if (filePath.includes("::")) return filePath;

  // Special case: lib.wesl/lib.wgsl becomes just the package name
  if (treatLibAsRoot && libRegex.test(filePath)) {
    return packageName;
  }

  const strippedPath = noSuffix(normalize(filePath));
  const moduleSuffix = strippedPath.replaceAll("/", "::");
  return packageName + "::" + moduleSuffix;
}

/** Normalize debug root to end with / or be empty. */
function normalizeDebugRoot(debugWeslRoot?: string): string {
  if (debugWeslRoot === undefined) return "./";
  if (debugWeslRoot === "") return "";
  return debugWeslRoot.endsWith("/") ? debugWeslRoot : debugWeslRoot + "/";
}

/** Try path variants with and without ./ prefix and extension suffixes. */
function findInVariants(
  sources: Record<string, string>,
  basePath: string,
  extensions: string[] = ["wesl", "wgsl"],
): string | undefined {
  const prefixes = ["", "./"];

  for (const prefix of prefixes) {
    const path = prefix + basePath;
    if (sources[path]) return sources[path];

    for (const ext of extensions) {
      const withExt = `${path}.${ext}`;
      if (sources[withExt]) return sources[withExt];
    }
  }

  return undefined;
}
