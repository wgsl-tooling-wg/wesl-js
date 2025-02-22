import { ParserInit, SrcMap } from "mini-parse";
import { ModuleElem } from "./AbstractElems.ts";
import { FlatImport, flattenTreeImport } from "./FlattenTreeImport.ts";
import { weslRoot } from "./parse/WeslGrammar.ts";
import { WeslStream } from "./parse/WeslStream.ts";
import { resetScopeIds, Scope, SrcModule } from "./Scope.ts";
import { generateScopes } from "./pass/GenerateScopes.ts";

/** result of a parse for one wesl module (e.g. one .wesl file)
 *
 * The parser constructs the AST constructed into three sections
 * for convenient access by the binding stage.
 *  - import statements
 *  - language elements (fn, struct, etc)
 *  - scopes
 *
 */
export interface WeslAST {
  /** source text for this module */
  srcModule: SrcModule;

  /** root module element */
  moduleElem: ModuleElem;

  /** root scope for this module */
  rootScope: Scope;
}

/** an extended version of the AST */
export interface BindingAST extends WeslAST {
  /* a flattened version of the import statements constructed on demand from import trees, and cached here */
  _flatImports?: FlatImport[];
}

export function parseSrcModule(srcModule: SrcModule): WeslAST {
  // TODO allow returning undefined for failure, or throw?

  resetScopeIds();
  const stream = new WeslStream(srcModule.src);

  const init: ParserInit = { stream };
  const parseResult = weslRoot.parse(init);
  if (parseResult === null) {
    throw new Error("parseWESL failed");
  }

  const rootScope = generateScopes(parseResult.value);

  return { srcModule, moduleElem: parseResult.value, rootScope };
}

export function parseWESL(src: string): WeslAST {
  const srcModule: SrcModule = {
    modulePath: "package::test",
    debugFilePath: "./test.wesl",
    src,
  };

  return parseSrcModule(srcModule);
}

/** @return a flattened form of the import tree for convenience in binding idents. */
export function flatImports(ast: BindingAST): FlatImport[] {
  if (ast._flatImports) return ast._flatImports;

  const flat = ast.moduleElem.imports.flatMap(t =>
    flattenTreeImport(t.imports),
  );
  ast._flatImports = flat;
  return flat;
}
