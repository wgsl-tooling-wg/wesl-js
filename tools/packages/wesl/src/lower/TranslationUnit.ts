import { ParserInit } from "mini-parse";
import { LinkedWesl } from "../LinkedWesl.ts";
import { CompilationOptions, compileToWgsl } from "./CompileToWgsl.ts";
import { ModulePath, ModulePathString, SrcModule, WeslAST } from "../Module.ts";
import { WeslStream } from "../parse/WeslStream.ts";
import { normalize, noSuffix } from "../PathUtil.ts";
import { str } from "../Util.ts";
import { weslRoot } from "../parse/WeslGrammar.ts";
import { VirtualFilesystem } from "../VirtualFilesystem.ts";

export class TranslationUnit {
  /** Key is module path, turned into a string */
  private modules = new Map<ModulePathString, WeslAST>();

  constructor(filesystem: VirtualFilesystem) {
    // We ignore @if blocks during the "fetch => parse => find all imports (including inline usages) => kick off more fetches" operation
    // Inline usages can be dependent on conditions, but pre-bundling gets to ignore that.
    // I had a cool partial condition evaluator on a branch, but long term,
    // I really don't want to maintain a complex conditional compilation infrastructure
    // ...
    // Also, libraries do not need to be added up front
    // It's entirely possible to switch out a library on the fly, just like one would switch out a single module on the fly.
  }

  addModule(module: SrcModule): WeslAST {
    const result = parseSrcModule(module);
    this.modules.set(module.modulePath.toString(), result);
    return result;
  }

  /* LATER
  async prebundleModules(rootModulePath: string[]) {
    const seenModules = new Set<string>(this.modules.keys());
    
      // the logic to dispatch a free worker with "parse(moduleSrc)" would go here
      // for now we're parsing it on the main thread
    const addModule = async (module: SrcModule) => this.addModule(module);

    // Maybe it shouldn't be "modulePath" but instead be a file path?
    async function fetchAndParseModuleInner(modulePath: string[]) {
      // to do: Add the virtual filesystem to the parsed registry
        const moduleSource = await this.virtualFilesystem.fetch(modulePath);
        const ast = await addModule(moduleSource);
    
        const childPromises: Promise<void>[] = [];
        // to do: imports are dependent on conditional compilation, and also include inline usages
        // of course we're just skipping the conditional compilation here
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

  compile(rootModulePath: ModulePath, opts: CompilationOptions): LinkedWesl {
    return compileToWgsl(rootModulePath, this.modules, opts);
  }

  /** Gets a module via its absolute path */
  getModule(modulePath: ModulePath): WeslAST | null {
    return this.modules.get(modulePath.toString()) ?? null;
  }

  getModules(): WeslAST[] {
    return [...this.modules.values()];
  }

  toDebugString(): string {
    return `modules: ${[...Object.keys(this.modules)]}`;
  }
}

export function parsedRegistry(): TranslationUnit {
  return new TranslationUnit();
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
  registry: TranslationUnit,
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
      throw new Error(str`duplicate module path: '${modulePath}'`);
    }
    registry.addModule({
      modulePath,
      debugFilePath,
      src,
    });
  });
}

export function parseSrcModule(srcModule: SrcModule): WeslAST {
  const stream = new WeslStream(srcModule.src);
  const init: ParserInit = { stream };
  const parseResult = weslRoot.parse(init);
  if (parseResult === null) {
    throw new Error("parseWESL failed");
  }

  return { srcModule, moduleElem: parseResult.value };
}
