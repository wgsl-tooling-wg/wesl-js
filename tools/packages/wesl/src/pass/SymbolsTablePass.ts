import type {
  AttributeElem,
  FunctionParam,
  GlobalDeclarationElem,
  DeclIdent,
  IfAttribute,
  ModuleElem,
  Statement,
  FullIdent,
} from "../parse/WeslElems";
import {
  AstVisitor,
  walkModule,
  walkGlobalDeclarationInner,
  walkImport,
  walkStatementInner,
  walkGlobalDeclaration,
  walkDirective,
  walkStatement,
} from "../AstVisitor.ts";
import { ExpressionElem, TemplatedIdentElem } from "../parse/ExpressionElem.ts";
import { ImportElem, ImportStatement } from "../parse/ImportElems.ts";
import { Conditions, evaluateConditions } from "../Conditions.ts";
import { DirectiveElem } from "../parse/DirectiveElem.ts";
import { assertUnreachable } from "../Assertions.ts";
import { stdEnumerant, stdFn, stdType } from "../StandardTypes.ts";
import { assertThat } from "../../../mini-parse/src/Assertions.ts";

/** An index into the symbol table */
export type SymbolReference = number;

/** An imported symbol. This will be path like `super::foo::bar` */
export type SymbolImport = string[];

export type SymbolsTable = {
  /** The name is either a string, or refers to a different symbol, or refers to an import */
  name: string | SymbolReference | SymbolImport;
}[];

export function getSymbol(
  table: SymbolsTable,
  reference: SymbolReference,
): string | SymbolImport {
  let result = table.at(reference);
  assertThat(result !== undefined);
  while (typeof result.name === "number") {
    result = table.at(result.name);
    assertThat(result !== undefined);
  }
  return result.name;
}

/** Binds the symbols and mutates the module to set the `symbolRef`s in {@link DeclIdent} and {@link TemplatedIdentElem} */
export function bindSymbols(
  module: ModuleElem,
  conditions: Conditions,
  packageNames: string[],
): SymbolsTable {
  const visitor = new BindSymbolsVisitor(conditions, packageNames);
  visitor.module(module);
  return visitor.symbolsTable;
}

/** decls currently visible in this scope */
interface LiveDecls {
  /** decls currently visible in this scope. Created lazily. */
  decls: null | Map<string, SymbolReference>;

  /** live decls in the parent scope. null for the modue root scope */
  parent: LiveDecls | null;
}

/** debug routine for logging LiveDecls */
function liveDeclsToString(liveDecls: LiveDecls): string {
  const { decls, parent } = liveDecls;
  const declsStr =
    decls == null ? "" : (
      Array.from(decls.entries())
        .map(([name, decl]) => `${name}:${decl}`)
        .join(", ")
    );
  const parentStr = parent ? liveDeclsToString(parent) : "null";
  return `decls: { ${declsStr} }, parent: ${parentStr}`;
}

/*
LATER try not creating a map for small scopes. 
Instead just track the current live index in the scope array.
*/

function findDecl(liveDecls: LiveDecls, ident: string): SymbolReference | null {
  if (liveDecls.decls === null) return null;
  const found = liveDecls.decls.get(ident);
  if (found !== undefined) {
    return found;
  }
  // recurse to check all idents in parent scope
  if (liveDecls.parent !== null) {
    return findDecl(liveDecls.parent, ident);
  } else {
    return null;
  }
}

function isPredeclared(name: string): boolean {
  return stdType(name) || stdFn(name) || stdEnumerant(name); // LATER add tests for enumerants case (e.g. var x = read;)
}

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
  public symbolsTable: SymbolsTable = [];

  /** Order is user declarations and imports > libraries > predeclared */
  rootDecls: LiveDecls = {
    decls: new Map(),
    parent: null,
  };
  liveDecls: LiveDecls;
  constructor(
    public conditions: Conditions,
    packageNames: string[],
  ) {
    super();
    this.liveDecls = this.rootDecls;
    this.addDeclaration("package", ["package"]);
    this.addDeclaration("super", ["super"]);
    packageNames.forEach(v => this.addDeclaration(v, [v]));
  }

  addDeclIdent(ident: DeclIdent) {
    ident.symbolRef = this.addDeclaration(ident.name, ident.name);
  }

  addDeclaration(
    name: string,
    value: string | SymbolReference | SymbolImport,
  ): SymbolReference {
    const symbolRef = this.symbolsTable.length;
    this.symbolsTable.push({
      name: value,
    });
    if (this.liveDecls.decls === null) {
      this.liveDecls.decls = new Map();
    }
    this.liveDecls.decls.set(name, symbolRef);
    return symbolRef;
  }

  resolveDeclaration(ident: TemplatedIdentElem) {
    const identStart = ident.ident.segments[0];
    const decl = findDecl(this.liveDecls, identStart);

    if (ident.ident.segments.length === 1) {
      // simple ident
      if (decl !== null) {
        ident.symbolRef = decl;
      } else if (isPredeclared(identStart)) {
        // Okay, fine
      } else {
        throw new Error(
          `Unresolved identifier ${fullIdentToString(ident.ident)}`,
        );
      }
    } else {
      // package reference
      if (decl !== null) {
        const symbolRef = this.symbolsTable.length;
        let firstPart = getSymbol(this.symbolsTable, decl);
        if (typeof firstPart === "string") {
          throw new Error(
            `Qualified imports must refer to a package or an imported item ${fullIdentToString(ident.ident)}`,
          );
        }
        // Add the package reference (this could be deduplicated)
        this.symbolsTable.push({
          name: [...firstPart, ...ident.ident.segments.slice(1)],
        });
        ident.symbolRef = symbolRef;
      } else {
        throw new Error(
          `Unresolved identifier ${fullIdentToString(ident.ident)}`,
        );
      }
    }
    ident.template?.forEach(v => this.expression(v));
  }

  /** Does conditional compilation allow the next element to be included. */
  evaluateIfAttribute(attributes: AttributeElem[] | undefined): boolean {
    const condAttribute = attributes?.find(v => v.attribute.kind === "@if");
    if (condAttribute === undefined) return true;
    return evaluateConditions(
      this.conditions,
      condAttribute.attribute as IfAttribute,
    );
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
        this.addDeclIdent(decl.name);
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
      this.liveDecls = {
        decls: null,
        parent: this.liveDecls,
      };
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
      this.liveDecls = {
        decls: null,
        parent: previousDecls,
      };
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
      this.addDeclIdent(statement.name);
    } else if (statement.kind === "compound-statement") {
      const previousDecls = this.liveDecls;
      this.liveDecls = {
        decls: null,
        parent: previousDecls,
      };
      statement.body.forEach(v => this.statement(v));
      this.liveDecls = previousDecls;
    } else {
      walkStatementInner(statement, this);
    }
  }

  override expression(expression: ExpressionElem): void {
    if (expression.kind === "templated-ident") {
      this.resolveDeclaration(expression);
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
    visitor.addDeclIdent(param.name); // The name is added *after* the rest of the declaration
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
    if (item.as !== undefined) {
      assertThat(item.as.length > 0);
      visitor.addDeclaration(item.as, [...segments, item.name]);
    } else {
      visitor.addDeclaration(item.name, [...segments, item.name]);
    }
    statement.finalSegment.as;
  }
}
