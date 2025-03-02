import { SrcMapBuilder } from "mini-parse";
import { assertThat } from "../Assertions.ts";
import { Conditions } from "../Conditions.ts";
import { LinkedWesl } from "../LinkedWesl.ts";
import { WeslJsPlugin } from "../Linker.ts";
import { ManglerFn } from "../Mangler.ts";
import { ModulePath, ModulePathString, WeslAST } from "../Module.ts";
import {
  bindSymbols,
  isSymbolImport,
  SymbolImport,
  SymbolReference,
  SymbolsTable,
  Visibility,
} from "../pass/SymbolsTablePass.ts";
import { str } from "../Util.ts";
import { lowerAndEmit } from "../LowerAndEmit.ts";

export interface CompilationOptions {
  conditions: Conditions;
  mangler: ManglerFn;

  plugins?: WeslJsPlugin[];
}

/** Everything has been fetched at this point. Link the files together in a single pass. */
export function compileToWgsl(
  rootModulePath: ModulePath,
  modules: ReadonlyMap<ModulePathString, WeslAST>,
  opts: CompilationOptions,
): LinkedWesl {
  const packageNames = getPackageNames(modules);

  const compiledModules = new Map<ModulePathString, CompiledWesl>();
  const getCompiledModule = (modulePath: ModulePath): CompiledWesl => {
    const modulePathString = modulePath.toString();
    const cached = compiledModules.get(modulePathString);
    if (cached !== undefined) {
      return cached;
    }
    const module = modules.get(modulePathString);
    if (module === undefined) {
      throw new Error(str`Could not find module ${modulePathString}`);
    }
    const compiledModule = compileSingleModule(module, opts, packageNames);
    compiledModules.set(modulePathString, compiledModule);
    return compiledModule;
  };

  // const resolveDependency = (symbolImport: SymbolImport):

  // No dead code elimination by default, this gives the user more type checking of their shader.
  // Dead code elimination should
  // - be benchmarked. I suspect that doing dead code elimination might be slower than not doing it.
  // - be implemented in an optional pass.
  //   The user should be able to choose between "precompile shader with max space savings" and
  //   "fully debug shader with naga"

  let result: SrcMapBuilder[] = [];

  const emittedModules = new Set<ModulePathString>();
  function emitModules(modulePath: ModulePath) {
    if (emittedModules.has(modulePath.toString())) return;

    const compiledModule = getCompiledModule(modulePath);

    for (const dependency of compiledModule.dependencies) {
      // Go from a dependency to the actual module that needs to be included
      resolveDependency(dependency);
    }
    // First do all imports, then do myself
    result.push(lowerAndEmit(compiledModule.result, opts.conditions));
  }
  emitModules(rootModulePath);

  return new LinkedWesl(SrcMapBuilder.build(result));
}

interface CompiledWesl {
  /** Imported items and modules */
  dependencies: SymbolImport[];

  /** The symbols table for this module */
  symbolsTable: SymbolsTable;

  /** The public declarations in this module */
  importableDecls: Map<string, Visibility>;

  /** The mutated AST */
  result: WeslAST;
}

function compileSingleModule(
  module: WeslAST,
  opts: CompilationOptions,
  packageNames: string[],
): CompiledWesl {
  module = structuredClone(module);
  const boundModule = bindSymbols(
    module.moduleElem,
    opts.conditions,
    packageNames,
  );
  const dependencies: SymbolImport[] = [];
  for (const symbol of boundModule.symbolsTable) {
    if (isSymbolImport(symbol.name)) {
      dependencies.push(symbol.name);
    }
  } // TODO: apply the passes (including the plugins)

  return {
    dependencies,
    symbolsTable: boundModule.symbolsTable,
    importableDecls: boundModule.importableDecls,
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
