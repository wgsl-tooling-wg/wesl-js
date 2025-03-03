import { SrcMap, SrcMapBuilder } from "mini-parse";
import { assertThat } from "../Assertions.ts";
import { Conditions } from "../Conditions.ts";
import { LinkedWesl } from "../LinkedWesl.ts";
import { WeslJsPlugin } from "../Linker.ts";
import { ManglerFn } from "../Mangler.ts";
import { ModulePath, ModulePathString, WeslAST } from "../Module.ts";
import {
  bindSymbols,
  ExportedDeclarations,
  SymbolReference,
  SymbolTable,
} from "../pass/SymbolsTablePass.ts";
import { str } from "../Util.ts";
import { lowerAndEmit } from "./LowerAndEmit.ts";

export interface CompilationOptions {
  conditions: Conditions;
  mangler: ManglerFn;

  plugins?: WeslJsPlugin[];
}

interface ItemInModule {
  modulePath: ModulePath;
  item: string;
  symbolTableId: number;
  symbolRef: SymbolReference;
}

/**
 * Everything has been fetched at this point. Link the files together.
 *
 * The modules are identified by their absolute path.
 * With re-exports, an import path could be different from the absolute path.
 */
export function compileToWgsl(
  rootModulePath: ModulePath,
  modules: ReadonlyMap<ModulePathString, WeslAST>,
  opts: CompilationOptions,
): LinkedWesl {
  const { compiledModules, symbolTables } = compileModules(
    rootModulePath,
    modules,
    opts,
  );
  // No dead code elimination by default, this gives the user more type checking of their shader.
  // Dead code elimination should
  // - be benchmarked. I suspect that doing dead code elimination might be slower than not doing it.
  // - be implemented in an optional pass.
  //   The user should be able to choose between "precompile shader with max space savings" and
  //   "fully debug shader with naga"

  let result = new SrcMap();

  // For the name mangling
  const globalNames = new Set<string>();

  // I could do the entire symbol table pass right now
  // HOWEVER compiledModules includes more modules than will actually be emitted
  opts.mangler(dependency.item, dependency.modulePath.path, globalNames);

  const emittedModules = new Set<ModulePathString>();
  function emitModules(modulePathString: ModulePathString) {
    if (emittedModules.has(modulePathString)) return;
    emittedModules.add(modulePathString);

    const compiledModule = compiledModules.get(modulePathString);
    assertThat(compiledModule !== undefined);

    const { moduleElem, srcModule } = compiledModule.result;
    lowerAndEmit(
      moduleElem,
      result.builderFor({
        text: srcModule.src,
        path: srcModule.debugFilePath,
      }),
      {
        conditions: opts.conditions,
        isRoot: emittedModules.size === 1,
        tables: symbolTables,
        tableId: compiledModule.symbolTableId,
      },
    );

    // Rely on the dependencies set being sorted
    for (const dependency of compiledModule.dependencies) {
      emitModules(dependency);
    }
  }
  emitModules(rootModulePath.toString());

  return new LinkedWesl(result);
}

interface CompiledModule extends CompiledSingleModule {
  symbolTableId: number;
  /** Which modules does this module depend on */
  dependencies: Set<ModulePathString>;
}

/**
 * Compiles all modules that the root module needs.
 * Also resolves the symbol table. No more imports.
 */
function compileModules(
  rootModulePath: ModulePath,
  modules: ReadonlyMap<ModulePathString, WeslAST>,
  opts: CompilationOptions,
) {
  const packageNames = getPackageNames(modules);
  const compiledModules = new Map<ModulePathString, CompiledModule>();

  const resolveCache = new Map<string, ItemInModule>();
  function resolveAndCompile(
    modulePath: ModulePath,
    item: string,
  ): ItemInModule {
    let cacheKey = modulePath.toString() + "::" + item;
    let cachedValue = resolveCache.get(cacheKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    for (let i = 1; i < modulePath.path.length; i++) {
      let partPath = new ModulePath(modulePath.path.slice(0, i));
      let partModule = compileModule(partPath.toString());
      let exportedDecl = partModule.exportedDeclarations.get(item);
      if (exportedDecl !== undefined) {
        // We don't have re-exports yet, so we can just check whether we are at the end
        if (i === modulePath.path.length - 1) {
          const result = {
            modulePath,
            item,
            symbolTableId: partModule.symbolTableId,
            symbolRef: exportedDecl.symbol,
          };
          resolveCache.set(cacheKey, result);
          return result;
        } else {
          throw new Error(
            str`Item ${item} already found in ${partPath}, but ${modulePath} was requested.`,
          );
        }
      }
    }
    throw new Error(str`Item ${item} not found in ${modulePath}`);
  }

  const symbolTables: SymbolTable[] = [];

  /** Compile a module and its dependencies */
  function compileModule(modulePathString: ModulePathString): CompiledModule {
    const cached = compiledModules.get(modulePathString);
    if (cached !== undefined) {
      return cached;
    }
    const module = modules.get(modulePathString);
    if (module === undefined) {
      throw new Error(str`Could not find module ${modulePathString}`);
    }
    const symbolTableId = symbolTables.length;
    const dependencies = new Set<ModulePathString>();

    const compiled: CompiledModule = {
      ...compileSingleModule(module, opts, packageNames),
      symbolTableId,
      dependencies,
    };
    symbolTables.push(compiled.symbolTable);
    compiledModules.set(modulePathString, compiled);

    for (let i = 0; i < compiled.symbolTable.length; i++) {
      const symbol = compiled.symbolTable[i];
      if (symbol.kind === "import") {
        const dependency = resolveAndCompile(symbol.module, symbol.value);
        dependencies.add(dependency.modulePath.toString());
        compiled.symbolTable[i] = {
          kind: "extern",
          table: dependency.symbolTableId,
          index: dependency.symbolRef,
        };
      }
    }
    return compiled;
  }
  compileModule(rootModulePath.toString());

  return {
    compiledModules,
    symbolTables,
  };
}

interface CompiledSingleModule {
  /** The symbols table for this module */
  symbolTable: SymbolTable;

  /** The public declarations in this module */
  exportedDeclarations: ExportedDeclarations;

  /** The mutated AST */
  result: WeslAST;
}

function compileSingleModule(
  module: WeslAST,
  opts: CompilationOptions,
  packageNames: string[],
): CompiledSingleModule {
  module = structuredClone(module);
  const boundModule = bindSymbols(
    module.moduleElem,
    opts.conditions,
    packageNames,
  );
  // TODO: apply the passes (including the plugins)

  return {
    symbolTable: boundModule.symbolsTable,
    exportedDeclarations: boundModule.exportedDeclarations,
    result: module,
  };
}

function getPackageNames(
  modules: ReadonlyMap<ModulePathString, WeslAST>,
): string[] {
  return [
    ...new Set(
      Iterator.from(modules.values()).map(v => v.srcModule.modulePath.path[0]),
    ),
  ];
}
