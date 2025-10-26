import type { WeslBundle } from "wesl";
import type { ModuleResolver } from "./ModuleResolver.ts";
import { parseSrcModule, type WeslAST } from "./ParseWESL.ts";
import { normalize, noSuffix } from "./PathUtil.ts";
import type { SrcModule } from "./Scope.ts";

/**
 * Immutable module cache that implements ModuleResolver.
 *
 * Parses all sources at construction time and provides read-only access.
 * Used for dependency analysis, tooling, and as a concrete ModuleResolver
 * implementation for testing and batch processing.
 */
export class ParsedRegistry implements ModuleResolver {
  private readonly modules: Map<string, WeslAST>;

  constructor(
    sources: Record<string, string>,
    packageName = "package",
    debugWeslRoot?: string,
  ) {
    this.modules = this.parseSources(sources, packageName, debugWeslRoot);
  }

  private parseSources(
    sources: Record<string, string>,
    packageName: string,
    debugWeslRoot?: string,
  ): Map<string, WeslAST> {
    const weslRoot = normalizeDebugRoot(debugWeslRoot);
    const result = new Map<string, WeslAST>();

    for (const [filePath, src] of Object.entries(sources)) {
      const modulePath = fileToModulePath(filePath, packageName);
      const ast = parseSrcModule({
        modulePath,
        debugFilePath: weslRoot + filePath,
        src,
      });
      if (!result.has(modulePath)) result.set(modulePath, ast);
    }

    return result;
  }

  resolveModule(modulePath: string): WeslAST | undefined {
    return this.modules.get(modulePath);
  }

  allModules(): Iterable<[string, WeslAST]> {
    return this.modules.entries();
  }
}

export function registryToString(registry: ParsedRegistry): string {
  return `modules: ${[...registry.allModules()].map(([path]) => path)}`;
}

function normalizeDebugRoot(debugWeslRoot?: string): string {
  if (debugWeslRoot === undefined) return "./";
  if (debugWeslRoot === "") return "";
  return debugWeslRoot.endsWith("/") ? debugWeslRoot : debugWeslRoot + "/";
}

const libRegex = /^lib\.w[eg]sl$/i;

function fileToModulePath(filePath: string, packageName: string): string {
  if (filePath.includes("::")) {
    return filePath;
  }
  if (packageName !== "package" && libRegex.test(filePath)) {
    return packageName;
  }

  const strippedPath = noSuffix(normalize(filePath));
  const moduleSuffix = strippedPath.replaceAll("/", "::");
  return packageName + "::" + moduleSuffix;
}

/** @deprecated Legacy test helper. Use `new ParsedRegistry({})` instead. */
export function parsedRegistry(): ParsedRegistry {
  return new ParsedRegistry({});
}

/**
 * @deprecated Legacy mutating API. Use `new ParsedRegistry(sources)` instead.
 *
 * Mutates registry by parsing sources and adding to internal modules map.
 */
export function parseIntoRegistry(
  srcFiles: Record<string, string>,
  registry: ParsedRegistry,
  packageName = "package",
  debugWeslRoot?: string,
): void {
  const weslRoot = normalizeDebugRoot(debugWeslRoot);
  const srcModules: SrcModule[] = Object.entries(srcFiles).map(
    ([filePath, src]) => {
      const modulePath = fileToModulePath(filePath, packageName);
      return { modulePath, debugFilePath: weslRoot + filePath, src };
    },
  );
  srcModules.forEach(mod => {
    const parsed = parseSrcModule(mod);
    const existingModule = registry.resolveModule(mod.modulePath);
    if (!existingModule) {
      // @ts-expect-error - accessing private field for legacy API
      registry.modules.set(mod.modulePath, parsed);
    }
  });
}

/**
 * @deprecated Legacy mutating API. Use BundleResolver instead.
 *
 * Recursively parses library bundles and their dependencies into registry.
 */
export function parseLibsIntoRegistry(
  libs: WeslBundle[],
  registry: ParsedRegistry,
): void {
  libs.forEach(({ modules, name }) => {
    parseIntoRegistry(modules, registry, name);
  });
  libs.forEach(({ dependencies }) => {
    parseLibsIntoRegistry(dependencies || [], registry);
  });
}
