/**
 * FetchingResolver - A resolver that can fetch modules from URLs.
 *
 * Provides both sync and async APIs:
 * - Sync `resolveModule`: for compatibility with current `findUnboundIdents`
 * - Async `resolveModuleAsync`: the future API with built-in HTTP fetching
 *
 * When wesl gets async BindIdents, the sync method and external shim loop
 * can be removed, and BindIdents will call resolveModuleAsync directly.
 */

import type { ModuleResolver, WeslAST } from "wesl";
import { modulePartsToRelativePath, parseSrcModule } from "wesl";

export interface FetchingResolverOptions {
  /** Base URL for fetching internal modules. */
  shaderRoot: string;
  /** Module path of the source file (for super:: resolution). */
  srcModulePath?: string;
}

/** Resolver with sync interface for findUnboundIdents and async API for fetching. */
export class FetchingResolver implements ModuleResolver {
  private readonly astCache = new Map<string, WeslAST>();
  readonly sources: Record<string, string>;
  private readonly requested = new Set<string>();
  private readonly shaderRoot: string;
  private readonly srcModuleParts?: string[];

  constructor(
    initialSources: Record<string, string>,
    options: FetchingResolverOptions,
  ) {
    this.sources = { ...initialSources };
    const { shaderRoot, srcModulePath } = options;
    this.shaderRoot = shaderRoot.replace(/\/$/, "");
    this.srcModuleParts = srcModulePath
      ? this.urlToModuleParts(srcModulePath)
      : undefined;
  }

  // -- Sync API (for findUnboundIdents compatibility) --

  /** Sync lookup - returns cached AST or undefined, records misses. */
  resolveModule(modulePath: string): WeslAST | undefined {
    const cached = this.astCache.get(modulePath);
    if (cached) return cached;

    const source = this.sources[modulePath];
    if (!source) {
      this.requested.add(modulePath);
      return undefined;
    }

    return this.parseAndCache(modulePath, source);
  }

  /** Module paths that were requested but not found. */
  getUnresolved(): string[] {
    return [...this.requested].filter(p => !this.astCache.has(p));
  }

  /** Get all parsed modules. */
  allModules(): Iterable<[string, WeslAST]> {
    for (const modulePath of Object.keys(this.sources)) {
      if (!this.astCache.has(modulePath)) {
        this.resolveModule(modulePath);
      }
    }
    return this.astCache.entries();
  }

  // -- Async API (future BindIdents interface) --

  /** Async lookup - returns cached AST or fetches, parses, and caches. */
  async resolveModuleAsync(modulePath: string): Promise<WeslAST | undefined> {
    const cached = this.astCache.get(modulePath);
    if (cached) return cached;

    if (this.sources[modulePath]) {
      return this.resolveModule(modulePath);
    }

    const source = await this.fetchInternal(modulePath);
    if (!source) return undefined;

    this.sources[modulePath] = source;
    this.requested.delete(modulePath);
    return this.parseAndCache(modulePath, source);
  }

  // -- Internal fetching --

  private async fetchInternal(modulePath: string): Promise<string | undefined> {
    const url = this.modulePathToUrl(modulePath);
    if (!url) return undefined;
    return fetchWithExtensions(url);
  }

  private modulePathToUrl(modulePath: string): string | undefined {
    const parts = modulePath.split("::");
    const filePath = modulePartsToRelativePath(
      parts,
      "package",
      this.srcModuleParts,
    );
    if (!filePath) {
      if (parts[0] === "super" && !this.srcModuleParts) {
        const msg = `Cannot resolve super:: without file context: ${modulePath}`;
        throw new Error(msg);
      }
      return undefined; // external module
    }
    return `${this.shaderRoot}/${filePath}`;
  }

  private parseAndCache(modulePath: string, source: string): WeslAST {
    const params = { modulePath, debugFilePath: modulePath, src: source };
    const ast = parseSrcModule(params);
    this.astCache.set(modulePath, ast);
    return ast;
  }

  private urlToModuleParts(urlPath: string): string[] {
    const path = urlPath
      .replace(this.shaderRoot, "")
      .replace(/^\//, "")
      .replace(/\.w[eg]sl$/, "");
    return ["package", ...path.split("/").filter(Boolean)];
  }
}

/** Try fetching URL with .wesl then .wgsl extension. */
async function fetchWithExtensions(
  baseUrl: string,
): Promise<string | undefined> {
  for (const ext of [".wesl", ".wgsl"]) {
    try {
      const response = await fetch(baseUrl + ext);
      if (response.ok) return response.text();
    } catch {
      // Try next extension
    }
  }
  return undefined;
}
