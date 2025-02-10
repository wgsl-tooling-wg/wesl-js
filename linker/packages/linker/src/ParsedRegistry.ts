import { WgslBundle } from "wesl";
import { parseSrcModule, parseWESL, WeslAST } from "./ParseWESL.ts";
import { RelativePath } from "./PathUtil.ts";
import { SrcModule } from "./Scope.ts";
import { makeModulePath, ModulePath } from "./FlattenTreeImport.ts";

export class ParsedRegistry {
  /**
   * key is module path, starting with `package` or with the library name
   * e.g. `rand_pkg::foo::bar`
   * e.g. `package::foo::bar::baz`
   */
  public modules: Map<string, WeslAST>;

  /** Maps a relative path to a module path */
  private pathToModule: Map<string, string>;
  constructor(
    modules: Map<string, WeslAST>,
    pathToModule: Map<string, string>,
  ) {
    this.modules = modules;
    this.pathToModule = pathToModule;
  }

  addModule(modulePath: ModulePath, src: SrcModule) {
    const ast = parseSrcModule(src, undefined);
    const stringPath = modulePath.join("::");
    if (this.modules.has(stringPath)) {
      throw new Error(`duplicate module path: '${stringPath}'`);
    }
    this.modules.set(stringPath, ast);
    this.pathToModule.set(src.filePath.toString(), stringPath);
  }

  get(modulePath: ModulePath): WeslAST | null {
    return this.modules.get(modulePath.join("::")) ?? null;
  }

  getByPath(filePath: RelativePath): WeslAST | null {
    const modulePath = this.pathToModule.get(filePath.toString());
    if (modulePath) {
      return this.modules.get(modulePath) ?? null;
    } else {
      return null;
    }
  }
}

export function parsedRegistry(): ParsedRegistry {
  return new ParsedRegistry(new Map(), new Map());
}

/**
 * Parse WESL each src module (file) into AST elements and a Scope tree.
 * @param src keys are module paths, values are wesl src strings
 */
export function parseModulesIntoRegistry(
  src: Record<string, string>,
): ParsedRegistry {
  const parsedEntries = Object.entries(src).map(([path, src]) => {
    const weslAST = parseWESL(src);
    return [path, weslAST] as const;
  });
  return new ParsedRegistry(new Map(parsedEntries), new Map());
}

/**
 * @param srcFiles    map of source strings by file path
 *                    key is '/' separated relative path (relative to srcRoot, not absolute file path )
 *                    value is wesl source string
 * @param registry    add parsed modules to this registry
 * @param packageName name of package
 * @package weslRoot  prefix of the path that will be trimmed off
 */
export function parseIntoRegistry(
  srcFiles: Record<string, string>,
  registry: ParsedRegistry,
  packageName: string = "package",
  weslRoot: string = "",
): void {
  const weslRootParsed = RelativePath.parse(weslRoot);
  const srcModules: { modulePath: ModulePath; srcModule: SrcModule }[] =
    Object.entries(srcFiles).map(([filePath, src]) => {
      const relativePath = RelativePath.parse(filePath);
      const modulePath = fileToModulePath(
        relativePath.stripPrefix(weslRootParsed),
        packageName,
      );
      return { modulePath, srcModule: { filePath: relativePath, src } };
    });
  srcModules.forEach(mod => {
    registry.addModule(mod.modulePath, mod.srcModule);
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

/** convert a relative file path (./shaders/foo/bar.wesl) and a wesl root (./shaders)
 *  to a module path (package::foo::bar) */
function fileToModulePath(
  filePath: RelativePath,
  packageName: string,
): ModulePath {
  // A bunch of quick hacks
  if (
    packageName !== "package" &&
    filePath.components.length === 1 &&
    libRegex.test(filePath.components[0])
  ) {
    // special case for lib.wesl files in external packages
    return makeModulePath([packageName]);
  }

  const modulePath: string[] = [packageName];
  modulePath.push(...filePath.components.slice(0, -1));
  let finalComponent = filePath.components[
    filePath.components.length - 1
  ].replace(/\.wgsl$|\.wesl$/, "");
  modulePath.push(finalComponent);
  return makeModulePath(modulePath);
}
