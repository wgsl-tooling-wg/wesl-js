import type { AppState, ParseError, Span } from "mini-parse";
import type {
  ConstAssertElem,
  ImportElem,
  ImportStatement,
  ModuleElem,
} from "./AbstractElems.ts";
import { filterValidElements } from "./Conditions.ts";
import { type FlatImport, flattenTreeImport } from "./FlattenTreeImport.ts";
import { parseWeslV2 } from "./parse/v2/ParseWeslV2.ts";
import {
  type Conditions,
  emptyScope,
  type Scope,
  type SrcModule,
} from "./Scope.ts";
import { errorHighlight, offsetToLineNumber } from "./Util.ts";
import type { OpenElem } from "./WESLCollect.ts";

/**
 * Result of parsing one WESL module (e.g., one .wesl file).
 *
 * The AST is constructed into three sections for the binding stage:
 *  - import statements
 *  - language elements (fn, struct, etc)
 *  - scopes
 */
export interface WeslAST {
  /** Source text for this module. */
  srcModule: SrcModule;
  /** Root module element. */
  moduleElem: ModuleElem;
  /** Root scope for this module. */
  rootScope: Scope;
  /** Imports found in this module. */
  imports: ImportStatement[];
  /** Module level const_assert statements. */
  moduleAsserts?: ConstAssertElem[];
}

/** Extended AST with cached flattened imports. */
export interface BindingAST extends WeslAST {
  /** Flattened import statements (cached on demand). */
  _flatImports?: FlatImport[];
}

/** Stable and unstable state used during parsing. */
export interface WeslParseState
  extends AppState<WeslParseContext, StableState> {
  context: WeslParseContext;
  stable: StableState;
}

/** Stable values used or accumulated during parsing. */
export type StableState = WeslAST;

/** Unstable values used during parse collection. */
export interface WeslParseContext {
  scope: Scope; // current scope (points somewhere in rootScope)
  openElems: OpenElem[]; // elems that are collecting their contents
}

/** Human-readable error when parsing WESL fails. */
export class WeslParseError extends Error {
  span: Span;
  src: SrcModule;
  constructor(opts: { cause: ParseError; src: SrcModule }) {
    const source = opts.src.src;
    const [lineNum, linePos] = offsetToLineNumber(opts.cause.span[0], source);
    let message = `${opts.src.debugFilePath}:${lineNum}:${linePos}`;
    message += ` error: ${opts.cause.message}\n`;
    message += errorHighlight(source, opts.cause.span).join("\n");
    super(message, { cause: opts.cause });
    this.span = opts.cause.span;
    this.src = opts.src;
  }
}

/** Parse a WESL file. */
export function parseSrcModule(srcModule: SrcModule): WeslAST {
  return parseWeslV2(srcModule);
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

/** @return flattened form of import tree for binding idents. */
export function flatImports(
  ast: BindingAST,
  conditions?: Conditions,
): FlatImport[] {
  // TODO cache per condition set?
  if (ast._flatImports && !conditions) return ast._flatImports;

  // Get ImportElem elements from moduleElem contents
  const importElems = ast.moduleElem.contents.filter(
    (elem): elem is ImportElem => elem.kind === "import",
  );

  // Filter based on conditions if provided
  const validImportElems = conditions
    ? filterValidElements(importElems, conditions)
    : importElems;

  // Extract ImportStatement from valid ImportElem elements
  const importStatements = validImportElems.map(elem => elem.imports);

  const flat = importStatements.flatMap(flattenTreeImport);
  if (!conditions) {
    ast._flatImports = flat;
  }
  return flat;
}
