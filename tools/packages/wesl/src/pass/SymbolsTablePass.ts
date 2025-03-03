import type {
  AttributeElem,
  FunctionParam,
  GlobalDeclarationElem,
  DeclIdent,
  IfAttribute,
  ModuleElem,
  Statement,
  FullIdent,
} from "../parse/WeslElems.ts";
import {
  AstVisitor,
  walkModule,
  walkGlobalDeclarationInner,
  walkImport,
  walkStatementInner,
  walkGlobalDeclaration,
  walkDirective,
  walkStatement,
  walkExpression,
} from "../AstVisitor.ts";
import { ExpressionElem, TemplatedIdentElem } from "../parse/ExpressionElem.ts";
import { ImportElem, ImportStatement } from "../parse/ImportElems.ts";
import { Conditions, evaluateIfAttribute } from "../Conditions.ts";
import { DirectiveElem } from "../parse/DirectiveElem.ts";
import { assertThat, assertUnreachable } from "../Assertions.ts";
import { stdEnumerant, stdFn, stdType } from "../StandardTypes.ts";
import { str } from "../Util.ts";
import { ModulePath } from "../Module.ts";

export type SymbolTableEntry =
  | {
      /** An index into the symbol table */
      kind: "ref";
      index: SymbolReference;
    }
  | {
      /**
       * An index into a secondary symbol table.
       * The symbol table pass will never generate this kind.
       */
      kind: "extern";
      table: number;
      index: SymbolReference;
    }
  | {
      kind: "name";
      isRoot: boolean;
      value: string;
    }
  | {
      /** An imported item */
      kind: "import";
      module: ModulePath;
      value: string;
    };

/** An index into the symbol table */
export type SymbolReference = number;

/** For mangling the symbols */
export type SymbolTable = SymbolTableEntry[];

export function getSymbol(
  tables: SymbolTable[],
  tableId: number,
  reference: SymbolReference,
): SymbolTableEntry & { kind: "name" | "import" } {
  let currentTable = tables[tableId];
  let result = currentTable[reference];
  while (true) {
    if (result.kind === "ref") {
      result = currentTable[result.index];
    } else if (result.kind === "extern") {
      currentTable = tables[result.table];
      result = currentTable[result.index];
    } else {
      break;
    }
  }
  return result;
}

export type Visibility = "public";

export type ExportedDeclarations = Map<
  string,
  { visibility: Visibility; symbol: SymbolReference }
>;

export interface BindSymbolsResult {
  symbolsTable: SymbolTable;
  /** Which declarations can be imported from this module. Depends on conditional compilation flags. */
  exportedDeclarations: ExportedDeclarations;
}

/** Binds the symbols and mutates the module to set the `symbolRef`s in {@link DeclIdent} and {@link TemplatedIdentElem} */
export function bindSymbols(
  module: ModuleElem,
  conditions: Conditions,
  packageNames: string[],
): BindSymbolsResult {
  const visitor = new BindSymbolsVisitor(conditions, packageNames);
  visitor.module(module);
  return {
    symbolsTable: visitor.symbolsTable,
    exportedDeclarations: visitor.exportedDeclarations,
  };
}

class LiveDecls {
  /** decls currently visible in this scope. Created lazily. */
  decls: null | Map<string, SymbolReference> = null;

  /** live decls in the parent scope. null for the modue root scope */
  parent: LiveDecls | null;
  constructor(parent: LiveDecls | null) {
    this.parent = parent;
  }

  findDecl(ident: string): SymbolReference | null {
    const found = this.decls?.get(ident);
    if (found !== undefined) {
      return found;
    }
    // recurse to check all idents in parent scope
    return this.parent?.findDecl(ident) ?? null;
  }

  set(ident: string, value: SymbolReference) {
    if (this.decls === null) {
      this.decls = new Map();
    }
    this.decls!.set(ident, value);
  }

  /** debug routine for logging LiveDecls */
  toString(): string {
    const { decls, parent } = this;
    const declsStr =
      decls == null ? "" : (
        Array.from(decls.entries())
          .map(([name, decl]) => `${name}:${decl}`)
          .join(", ")
      );
    const parentStr = parent ? parent.toString() : "null";
    return `decls: { ${declsStr} }, parent: ${parentStr}`;
  }
}

function isPredeclared(name: string): boolean {
  return stdType(name) || stdFn(name) || stdEnumerant(name); // LATER add tests for enumerants case (e.g. var x = read;)
}

/** An imported symbol. This will be path like `super::foo::bar` */
type SymbolImport = string[];

/**
 * Goals:
 * - link references identifiers to their declaration identifiers
 * - produce a list of symbols that can be mangled
 * - respect conditional compilation
 *
 * When iterating through the idents inside a scope, we maintain a parallel data structure of
 * 'liveDecls', the declarations that are visible in the current scope at the currently
 * processed ident, along with a link to parent liveDecls for their current decl visibility.
 */
class BindSymbolsVisitor extends AstVisitor {
  public symbolsTable: SymbolTable = [];

  public exportedDeclarations: ExportedDeclarations = new Map();

  /**
   * Imports have no effect until they're used.
   * So they live in a separate place.
   * This stores decls like `foo` in `import mylib::foo`.
   */
  importDecls = new Map<string, SymbolImport | SymbolReference>();

  /** Order is user declarations and imports > libraries > predeclared */
  rootDecls = new LiveDecls(null);
  liveDecls: LiveDecls;
  constructor(
    public conditions: Conditions,
    packageNames: string[],
  ) {
    super();
    this.liveDecls = this.rootDecls;
    // These imports can be shadowed. So they're set without any checks.
    this.importDecls.set("package", ["package"]);
    this.importDecls.set("super", ["super"]);
    packageNames.forEach(v => this.importDecls.set(v, [v]));
  }

  addDeclIdent(ident: DeclIdent, isRoot: boolean): SymbolReference {
    if (
      (isRoot && this.rootDecls.decls?.has(ident.name)) ||
      this.importDecls.has(ident.name)
    ) {
      throw new Error(str`Redefined ${ident.name}`);
    }
    const symbolRef = this.symbolsTable.length;
    this.symbolsTable.push({ kind: "name", isRoot, value: ident.name });
    this.liveDecls.set(ident.name, symbolRef);
    ident.symbolRef = symbolRef;
    return symbolRef;
  }

  addImportDeclaration(name: string, value: SymbolImport) {
    assertThat(name.length > 0);
    if (this.importDecls.has(name)) {
      throw new Error(
        str`Imported ${value.join("::")} conflicts with existing import for ${name}`,
      );
    }
    if (this.rootDecls.decls?.has(name)) {
      throw new Error(
        str`Imported ${value.join("::")} conflicts with local ${name}`,
      );
    }
    this.importDecls.set(name, value);
  }

  resolveDeclaration(ident: TemplatedIdentElem): SymbolReference | null {
    const identStart = ident.ident.segments[0];
    let decl: SymbolReference | SymbolImport | null =
      this.liveDecls.findDecl(identStart) ??
      this.importDecls.get(identStart) ??
      null;

    if (decl !== null && typeof decl === "number") {
      assertThat(
        ident.ident.segments.length === 1,
        str`${decl} is not a module, cannot access ${ident.ident.segments.join("::")}`,
      );
      ident.symbolRef = decl;
      return decl;
    } else if (decl !== null) {
      // Symbol import (we concat the paths)
      const modulePath = new ModulePath([
        // Cut off the duplicated part
        ...decl.slice(0, -1),
        // And separately store the item name
        ...ident.ident.segments.slice(0, -1),
      ]);
      const moduleItem = ident.ident.segments.at(-1)!;

      const symbolRef = this.symbolsTable.length;
      this.symbolsTable.push({
        kind: "import",
        module: modulePath,
        value: moduleItem,
      });
      ident.symbolRef = symbolRef;
      return symbolRef;
    } else if (isPredeclared(identStart)) {
      return null;
    } else {
      throw new Error(
        `Unresolved identifier ${fullIdentToString(ident.ident)}`,
      );
    }
  }

  /** Does conditional compilation allow the next element to be included. */
  evaluateIfAttribute(attributes: AttributeElem[] | undefined): boolean {
    return evaluateIfAttribute(this.conditions, attributes);
  }

  override module(module: ModuleElem): void {
    // Add all the global decls
    for (const decl of module.declarations) {
      if (this.evaluateIfAttribute(decl.attributes) === false) {
        continue;
      }
      if (
        decl.kind === "alias" ||
        decl.kind === "declaration" ||
        decl.kind === "function" ||
        decl.kind === "struct"
      ) {
        const symbol = this.addDeclIdent(decl.name, true);
        this.exportedDeclarations.set(decl.name.name, {
          visibility: "public",
          symbol,
        });
      } else if (decl.kind === "assert") {
        // no decl to add
      } else {
        assertUnreachable(decl);
      }
    }

    walkModule(module, this);
  }

  override directive(directive: DirectiveElem): void {
    if (this.evaluateIfAttribute(directive.attributes) === false) {
      return;
    }
    walkDirective(directive, this);
  }

  override globalDeclaration(declaration: GlobalDeclarationElem): void {
    if (this.evaluateIfAttribute(declaration.attributes) === false) {
      return;
    }
    walkGlobalDeclaration(declaration, this);
  }

  override import(importElem: ImportElem): void {
    walkImport(importElem, this);
    walkImportStatement(importElem.imports, [], this);
  }

  override globalDeclarationInner(declaration: GlobalDeclarationElem): void {
    const kind = declaration.kind;
    if (kind === "alias") {
      walkGlobalDeclarationInner(declaration, this);
    } else if (kind === "assert") {
      walkGlobalDeclarationInner(declaration, this);
    } else if (kind === "declaration") {
      walkGlobalDeclarationInner(declaration, this);
    } else if (kind === "function") {
      declaration.returnAttributes?.forEach(v => this.attribute(v));
      if (declaration.returnType !== undefined) {
        this.expression(declaration.returnType);
      }
      declaration.body.attributes?.forEach(v => this.attribute(v));
      // Now introduce the function scope, and put both the params and the body in that very scope
      this.liveDecls = new LiveDecls(this.liveDecls);
      walkFunctionParams(declaration.params, this);
      declaration.body.body.forEach(v => this.statement(v));
      this.liveDecls = this.rootDecls;
    } else if (kind === "struct") {
      walkGlobalDeclarationInner(declaration, this);
    } else {
      assertUnreachable(kind);
    }
  }

  override statement(statement: Statement): void {
    if (this.evaluateIfAttribute(statement.attributes) === false) {
      return;
    }
    walkStatement(statement, this);
  }

  override statementInner(statement: Statement): void {
    if (statement.kind === "for-statement") {
      const previousDecls = this.liveDecls;
      this.liveDecls = new LiveDecls(previousDecls);
      // Function initializers run in effectively in the same scope as the body
      // See: https://github.com/gpuweb/gpuweb/issues/5024
      // From the spec: Two declarations [...] must not [...] have the same end-of-scope.
      if (statement.initializer !== undefined) {
        this.statement(statement.initializer);
      }
      if (statement.condition !== undefined) {
        this.expression(statement.condition);
      }
      if (statement.update !== undefined) {
        this.statement(statement.update);
      }
      // For loops have different scoping rules from functions,
      // so we resolve the attributes after the initializer
      // I believe that WGSL doesn't spec this out,
      // since there cannot be an attribute that refers to an identifier here
      statement.body.attributes?.forEach(v => this.attribute(v));
      statement.body.body.forEach(v => this.statement(v));
      this.liveDecls = previousDecls;
    } else if (statement.kind === "declaration") {
      // First evaluate the declaration
      walkStatementInner(statement, this);
      // And then add it
      this.addDeclIdent(statement.name, false);
    } else if (statement.kind === "compound-statement") {
      const previousDecls = this.liveDecls;
      this.liveDecls = new LiveDecls(previousDecls);
      statement.body.forEach(v => this.statement(v));
      this.liveDecls = previousDecls;
    } else {
      walkStatementInner(statement, this);
    }
  }

  override expression(expression: ExpressionElem): void {
    if (expression.kind === "templated-ident") {
      this.resolveDeclaration(expression);
      expression.template?.forEach(v => this.expression(v));
    } else {
      walkExpression(expression, this);
    }
  }
}

function fullIdentToString(ident: FullIdent) {
  return ident.segments.join("::");
}

function walkFunctionParams(
  params: FunctionParam[],
  visitor: BindSymbolsVisitor,
) {
  for (const param of params) {
    if (visitor.evaluateIfAttribute(param.attributes) === false) continue;
    param.attributes?.forEach(v => visitor.attribute(v));
    visitor.expression(param.type);
    visitor.addDeclIdent(param.name, false); // The name is added *after* the rest of the declaration
  }
}

function walkImportStatement(
  statement: ImportStatement,
  segments: string[],
  visitor: BindSymbolsVisitor,
) {
  if (statement.finalSegment.kind === "import-collection") {
    const childSegments = [...segments, ...statement.segments.map(v => v.name)];
    statement.finalSegment.subtrees.forEach(v =>
      walkImportStatement(v, childSegments, visitor),
    );
  } else {
    const item = statement.finalSegment;
    visitor.addImportDeclaration(item.as ?? item.name, [
      ...segments,
      item.name,
    ]);
  }
}
