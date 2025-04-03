import { parseSrcModule, type WeslAST } from "./ParseWESL.ts";
import { normalize, noSuffix } from "./PathUtil.ts";
import { resetScopeIds, type SrcModule } from "./Scope.ts";
import type { WeslBundle } from "./WeslBundle.ts";

export interface ParsedRegistry {
  modules: Record<string, WeslAST>; // key is module path, e.g. "rand_pkg::foo::bar"
}

export function parsedRegistry(): ParsedRegistry {
  resetScopeIds(); // for debug
  return { modules: {} };
}

/** for debug */
export function registryToString(registry: ParsedRegistry): string {
  return `modules: ${[...Object.keys(registry.modules)]}`;
}

/** Look up a module with a flexible selector.
 *    :: separated module path,   package::util
 *    / separated file path       ./util.wesl (or ./util)
 *          - note: a file path should not include a weslRoot prefix, e.g. not ./shaders/util.wesl
 *    simpleName                  util
 */
export function selectModule(
  parsed: ParsedRegistry,
  selectPath: string,
  packageName = "package",
): WeslAST | undefined {
  // dlog({reg: [...Object.keys(parsed.modules)]});
  let modulePath: string;
  if (selectPath.includes("::")) {
    modulePath = selectPath;
  } else if (
    selectPath.includes("/") ||
    selectPath.endsWith(".wesl") ||
    selectPath.endsWith(".wgsl")
  ) {
    modulePath = fileToModulePath(selectPath, packageName);
  } else {
    modulePath = packageName + "::" + selectPath;
  }

  return parsed.modules[modulePath];
}

/**
 * @param srcFiles    map of source strings by file path
 *                    key is '/' separated relative path (relative to srcRoot, not absolute file path )
 *                    value is wesl source string
 * @param registry    add parsed modules to this registry
 * @param packageName name of package
 */
export function parseIntoRegistry(
  srcFiles: Record<string, string>,
  registry: ParsedRegistry,
  packageName: string = "package",
  debugWeslRoot?: string,
): void {
  if (debugWeslRoot === undefined) {
    debugWeslRoot = "";
  } else if (!debugWeslRoot.endsWith("/")) {
    debugWeslRoot += "/";
  }
  const srcModules: SrcModule[] = Object.entries(srcFiles).map(
    ([filePath, src]) => {
      const modulePath = fileToModulePath(filePath, packageName);
      return { modulePath, debugFilePath: debugWeslRoot + filePath, src };
    },
  );
  srcModules.forEach((mod) => {
    const parsed = parseSrcModule(mod, undefined);
    if (registry.modules[mod.modulePath]) {
      throw new Error(`duplicate module path: '${mod.modulePath}'`);
    }
    registry.modules[mod.modulePath] = parsed;
  });
}

export function parseLibsIntoRegistry(
  libs: WeslBundle[],
  registry: ParsedRegistry,
): void {
  libs.forEach(({ modules, name }) =>
    parseIntoRegistry(modules, registry, name)
  );
}

const libRegex = /^lib\.w[eg]sl$/i;

/** convert a file path (./foo/bar.wesl)
 *  to a module path (package::foo::bar) */
function fileToModulePath(filePath: string, packageName: string): string {
  if (filePath.includes("::")) {
    // already a module path
    return filePath;
  }
  if (packageName !== "package" && libRegex.test(filePath)) {
    // special case for lib.wesl files in external packages
    return packageName;
  }

  const strippedPath = noSuffix(normalize(filePath));
  const moduleSuffix = strippedPath.replaceAll("/", "::");
  const modulePath = packageName + "::" + moduleSuffix;
  return modulePath;
}
