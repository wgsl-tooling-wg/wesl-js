import { Conditions } from "../Conditions";
import { LinkedWesl } from "../LinkedWesl";
import { WeslAST } from "../ParseWESL";

export interface CompilationOptions {
  conditions: Conditions;
}

export function compileToWgsl(
  modules: Map<string, WeslAST>,
  opts: CompilationOptions,
): LinkedWesl {
  // TODO:
}
