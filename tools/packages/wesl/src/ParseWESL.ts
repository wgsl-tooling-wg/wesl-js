import { AppState, ParserInit, SrcMap } from "mini-parse";
import { ImportStatement, ModuleElem } from "./AbstractElems.ts";
import { FlatImport, flattenTreeImport } from "./FlattenTreeImport.ts";
import { weslRoot } from "./parse/WeslGrammar.ts";
import { WeslStream } from "./parse/WeslStream.ts";
import { emptyScope, Scope, SrcModule } from "./Scope.ts";
import { OpenElem } from "./WESLCollect.ts";

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

  /** imports found in this module */
  imports: ImportStatement[];
}

/** an extended version of the AST */
export interface BindingAST extends WeslAST {
  /* a flattened version of the import statements constructed on demand from import trees, and cached here */
  _flatImports?: FlatImport[];
}

/** stable and unstable state used during parsing */
export interface WeslParseState
  extends AppState<WeslParseContext, StableState> {
  context: WeslParseContext;
  stable: StableState;
}

/** stable values used or accumulated during parsing */
export type StableState = WeslAST;

/** unstable values used during parse collection */
export interface WeslParseContext {
  scope: Scope; // current scope (points somewhere in rootScope)
  openElems: OpenElem[]; // elems that are collecting their contents
}

export function parseSrcModule(srcModule: SrcModule, srcMap?: SrcMap): WeslAST {
  // TODO allow returning undefined for failure, or throw?

  const stream = new WeslStream(srcModule.src);

  const appState = blankWeslParseState(srcModule);

  const init: ParserInit = { stream, appState };
  const parseResult = weslRoot.parse(init);
  if (parseResult === null) {
    throw new Error("parseWESL failed");
  }

  return appState.stable as WeslAST;
}

export function parseWESL(src: string, srcMap?: SrcMap): WeslAST {
  const srcModule: SrcModule = {
    modulePath: "package::test",
    debugFilePath: "./test.wesl",
    src,
  };

  return parseSrcModule(srcModule, srcMap);
}

export function blankWeslParseState(srcModule: SrcModule): WeslParseState {
  const rootScope = emptyScope(null);
  const moduleElem = null as any; // we'll fill this in later
  return {
    context: { scope: rootScope, openElems: [] },
    stable: { srcModule, imports: [], rootScope, moduleElem },
  };
}

export function syntheticWeslParseState(): WeslParseState {
  const srcModule: SrcModule = {
    modulePath: "package::test",
    debugFilePath: "./test.wesl",
    src: "",
  };

  return blankWeslParseState(srcModule);
}

/** @return a flattened form of the import tree for convenience in binding idents. */
export function flatImports(ast: BindingAST): FlatImport[] {
  if (ast._flatImports) return ast._flatImports;

  const flat = ast.imports.flatMap(flattenTreeImport);
  ast._flatImports = flat;
  return flat;
}
