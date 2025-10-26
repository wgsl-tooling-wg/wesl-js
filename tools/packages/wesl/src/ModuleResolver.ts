import type { ParsedRegistry } from "./ParsedRegistry.ts";
import { parseSrcModule, type WeslAST } from "./ParseWESL.ts";

/** Resolves module paths to parsed ASTs, handling caching and lazy loading */
export interface ModuleResolver {
  /** Resolve a module path to its parsed AST
   * @param modulePath :: separated module path like "package::foo::bar"
   * @return parsed AST or undefined if module not found
   */
  resolveModule(modulePath: string): WeslAST | undefined;
}

/** Resolver that loads modules from an in-memory record of sources */
export class RecordResolver implements ModuleResolver {
  readonly astCache = new Map<string, WeslAST>();
  readonly sources: Record<string, string>;
  readonly packageName: string;
  readonly debugWeslRoot: string;

  constructor(
    sources: Record<string, string>,
    packageName = "package",
    debugWeslRoot?: string,
  ) {
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
    if (this.sources[modulePath]) {
      return this.sources[modulePath];
    }

    const filePath = this.moduleToFilePath(modulePath);
    const variants = [
      filePath,
      filePath + ".wesl",
      "./" + filePath,
      "./" + filePath + ".wesl",
      filePath + ".wgsl",
      "./" + filePath + ".wgsl",
    ];

    for (const variant of variants) {
      if (this.sources[variant]) {
        return this.sources[variant];
      }
    }

    return undefined;
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
}

/** Composite resolver that tries multiple resolvers in order */
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

/** Resolver that wraps a ParsedRegistry (for libraries) */
export class RegistryResolver implements ModuleResolver {
  readonly registry: ParsedRegistry;

  constructor(registry: ParsedRegistry) {
    this.registry = registry;
  }

  resolveModule(modulePath: string): WeslAST | undefined {
    return this.registry.modules[modulePath];
  }
}

/** Normalize debugWeslRoot to ensure it ends with / or is empty */
function normalizeDebugRoot(debugWeslRoot?: string): string {
  if (debugWeslRoot === undefined) return "./";
  if (debugWeslRoot === "") return "";
  return debugWeslRoot.endsWith("/") ? debugWeslRoot : debugWeslRoot + "/";
}
