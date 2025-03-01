import { WgslBundle } from "wesl";
import { parseSrcModule, SrcModule, WeslAST } from "./ParseWESL.ts";
import { normalize, noSuffix } from "./PathUtil.ts";

export class ParsedRegistry {
  /** Key is module path, turned into a string */
  private modules = new Map<string, WeslAST>();

  constructor() {}

  addModule(module: SrcModule): WeslAST {
    const result = parseSrcModule(module);
    this.modules.set(module.modulePath, result);
    return result;
  }

  /* LATER
  async addModules(rootModulePath: string[]) {
    const seenModules = new Set<string>(this.modules.keys());
    
      // the logic to dispatch a free worker with "parse(moduleSrc)" would go here
      // for now we're parsing it on the main thread
    const addModule = async (module: SrcModule) => this.addModule(module);

    // Maybe it shouldn't be "modulePath" but instead be a file path?
    async function fetchAndParseModuleInner(modulePath: string[]) {
      // Incremental compilation note: A module depends on
      // - the source
      // - the used conditions

      // to do: Add the virtual filesystem to the parsed registry
        const moduleSource = await this.virtualFilesystem.fetch(modulePath);
        const ast = await addModule(moduleSource);
    
        const childPromises: Promise<void>[] = [];
        // to do: imports are dependent on conditional compilation, and also include inline usages
        for(const importElem of ast.moduleElem.imports) {
            if(seenModules.has(importElem)) {
                // skip
            } else {
                seenModules.add(importElem);
                childPromises.push(fetchAndParseModule(import));
            }
        }
        await Promise.all(childPromises);
    }

    await(fetchAndParseModuleInner(rootModulePath));
  }*/

  getModule(modulePath: string[]): WeslAST | null {
    return this.modules.get(modulePath.join("::")) ?? null;
  }

  getModules(): WeslAST[] {
    return [...this.modules.values()];
  }

  toDebugString(): string {
    return `modules: ${[...Object.keys(this.modules)]}`;
  }
}

export function parsedRegistry(): ParsedRegistry {
  return new ParsedRegistry();
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
  Object.entries(srcFiles).forEach(([filePath, src]) => {
    const modulePath = fileToModulePath(filePath, packageName);
    const debugFilePath = debugWeslRoot + filePath;
    if (registry.getModule(modulePath)) {
      throw new Error(`duplicate module path: '${modulePath.join("::")}'`);
    }
    registry.addModule({
      modulePath: modulePath.join("::"),
      debugFilePath,
      src,
    });
  });
}

const libRegex = /^lib\.w[eg]sl$/i;

/** convert a file path (./foo/bar.wesl)
 *  to a module path (package::foo::bar) */
function fileToModulePath(filePath: string, packageName: string): string[] {
  if (filePath.includes("::")) {
    // already a module path
    return filePath.split("::");
  }
  if (packageName !== "package" && libRegex.test(filePath)) {
    // special case for lib.wesl files in external packages
    return [packageName];
  }

  const strippedPath = noSuffix(normalize(filePath));
  const moduleSuffix = strippedPath.split("/");
  const modulePath = [packageName, ...moduleSuffix];
  return modulePath;
}
