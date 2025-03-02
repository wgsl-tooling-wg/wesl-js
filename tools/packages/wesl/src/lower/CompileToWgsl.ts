import { Conditions } from "../Conditions";
import { LinkedWesl } from "../LinkedWesl";
import { ModulePath, WeslJsPlugin } from "../Linker";
import { ManglerFn } from "../Mangler";
import { WeslAST } from "../ParseWESL";

export interface CompilationOptions {
  conditions: Conditions;
  mangler: ManglerFn;

  plugins?: WeslJsPlugin[];
}

/** Everything has been fetched at this point. Link the files together in a single pass. */
export function compileToWgsl(
  rootModulePath: ModulePath,
  modules: Map<string, WeslAST>,
  opts: CompilationOptions,
): LinkedWesl {
  // TODO:
}
