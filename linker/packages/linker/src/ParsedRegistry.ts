import { WgslBundle } from "wesl";
import { parseSrcModule, parseWESL, WeslAST } from "./ParseWESL.ts";
import { normalize, noSuffix } from "./PathUtil.ts";
import { SrcModule } from "./Scope.ts";

export interface ParsedRegistry {
  modules: Record<string, WeslAST>; // key is module path, e.g. "rand_pkg::foo::bar"
}

export function parsedRegistry(): ParsedRegistry {
  return { modules: {} };
}

/**
 * Parse WESL each src module (file) into AST elements and a Scope tree.
 * @param src keys are module paths, values are wesl src strings
 */
export function parseWeslSrc(src: Record<string, string>): ParsedRegistry {
  const parsedEntries = Object.entries(src).map(([path, src]) => {
    const weslAST = parseWESL(src);
    return [path, weslAST];
  });
  return { modules: Object.fromEntries(parsedEntries) };
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
  } else if (selectPath.includes("/")) {
    modulePath = fileToModulePath(selectPath, packageName, "");
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
  weslRoot: string = "",
  maxParseCount?: number,
): void {
  const srcModules: SrcModule[] = Object.entries(srcFiles).map(
    ([filePath, src]) => {
      const modulePath = fileToModulePath(filePath, packageName, weslRoot);
      return { modulePath, filePath, src };
    },
  );
  srcModules.forEach(mod => {
    const parsed = parseSrcModule(mod, undefined, maxParseCount);
    if (registry.modules[mod.modulePath]) {
      throw new Error(`duplicate module path: '${mod.modulePath}'`);
    }
    registry.modules[mod.modulePath] = parsed;
  });
}

export function parseLibsIntoRegistry(
  libs: WgslBundle[],
  registry: ParsedRegistry,
): void {
  libs.forEach(({ modules, name }) =>
    parseIntoRegistry(modules, registry, name),
  );
}

const libRegex = /^lib\.w[eg]sl$/i;

/** convert a file path (./shaders/foo/bar.wesl) and a wesl root (./shaders)
 *  to a module path (package::foo::bar) */
function fileToModulePath(
  filePath: string,
  packageName: string,
  weslRoot: string,
): string {
  if (filePath.includes("::")) {
    // already a module path
    return filePath;
  }
  if (packageName !== "package" && libRegex.test(filePath)) {
    // special case for lib.wesl files in external packages
    return packageName;
  }

  const rootStart = filePath.indexOf(weslRoot);
  if (rootStart === -1) {
    throw new Error(`file ${filePath} not in root ${weslRoot}`);
  }
  const postRoot = filePath.slice(rootStart + weslRoot.length);
  const strippedPath = noSuffix(normalize(postRoot));
  const moduleSuffix = strippedPath.replaceAll("/", "::");
  const modulePath = packageName + "::" + moduleSuffix;
  return modulePath;
}
