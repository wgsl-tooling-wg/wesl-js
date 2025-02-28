import type {
  AttributeElem,
  FunctionParam,
  GlobalDeclarationElem,
  DeclIdent,
  IfAttribute,
  ModuleElem,
  Statement,
  Transform,
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
import { PT } from "../parse/BaseGrammar.ts";
import { ExpressionElem } from "../parse/ExpressionElem.ts";
import { ImportElem } from "../parse/ImportElems.ts";
import { Conditions, evaluateConditions } from "../Conditions.ts";
import { DirectiveElem } from "../parse/DirectiveElem.ts";
import { assertUnreachable } from "../Assertions.ts";

/** After we're done with the symbols table, we have idents that point at the symbols table. */
export interface ST extends Transform {
  symbolRef: number;
}

/** An index into the symbol table */
export type SymbolReference = number;

/** An imported symbol. This will be path like `super::foo::bar` */
export type SymbolImport = number;

export type SymbolsTable = {
  /** The name is either a string, or refers to a different symbol, or refers to an import */
  name: string | SymbolReference | string[];
}[];

/** decls currently visible in this scope */
interface LiveDecls {
  /** decls currently visible in this scope. Created lazily. */
  decls: null | Map<string, SymbolReference>;

  /** live decls in the parent scope. null for the modue root scope */
  parent: LiveDecls | null;
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
class BindSymbolsVisitor extends AstVisitor<PT> {
  public symbolsTable: SymbolsTable = [];
  rootDecls: LiveDecls = {
    decls: new Map(),
    parent: null,
  };
  liveDecls: LiveDecls;
  constructor(
    public conditions: Conditions,
    public packageName: Set<String>,
  ) {
    super();
    this.liveDecls = this.rootDecls;
  }

  addDeclaration(ident: DeclIdent<PT>) {
    this.symbolsTable.push({
      name: ident.name,
    });
    if (this.liveDecls.decls === null) {
      this.liveDecls.decls = new Map();
    }
    const symbolRef = this.symbolsTable.length;
    this.liveDecls.decls.set(ident.name, symbolRef);
    (ident as any as DeclIdent<ST>).symbolRef = symbolRef;
  }

  /** Does conditional compilation allow the next element to be included. */
  evaluateIfAttribute(attributes: AttributeElem<PT>[] | undefined): boolean {
    const condAttribute = attributes?.find(v => v.attribute.kind === "@if");
    if (condAttribute === undefined) return true;
    return evaluateConditions(
      this.conditions,
      condAttribute.attribute as IfAttribute,
    );
  }

  override module(module: ModuleElem<PT>): void {
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
        this.addDeclaration(decl.name);
      } else if (decl.kind === "assert") {
        // no decl to add
      } else {
        assertUnreachable(decl);
      }
    }

    walkModule(module, this);
  }

  override directive(directive: DirectiveElem<PT>): void {
    if (this.evaluateIfAttribute(directive.attributes) === false) {
      return;
    }
    walkDirective(directive, this);
  }

  override globalDeclaration(declaration: GlobalDeclarationElem<PT>): void {
    if (this.evaluateIfAttribute(declaration.attributes) === false) {
      return;
    }
    walkGlobalDeclaration(declaration, this);
  }

  override import(importElem: ImportElem<PT>): void {
    // importElem.imports.
    // TODO: Emit all the imports
    walkImport(importElem, this);
  }

  override globalDeclarationInner(
    declaration: GlobalDeclarationElem<PT>,
  ): void {
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

  override statement(statement: Statement<PT>): void {
    if (this.evaluateIfAttribute(statement.attributes) === false) {
      return;
    }
    walkStatement(statement, this);
  }

  statementInner(statement: Statement<PT>): void {
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
      this.addDeclaration(statement.name);
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

  expression(expression: ExpressionElem<PT>): void {
    if (expression.kind === "templated-ident") {
      // TODO: Resolve
      expression.template?.forEach(v => this.expression(v));
    }
  }
}

export function bindSymbols(
  module: ModuleElem<PT>,
  conditions: Conditions,
  packageNames: Set<String>,
): {
  symbols: SymbolsTable;
  module: ModuleElem<ST>;
} {
  const visitor = new BindSymbolsVisitor(conditions, packageNames);
  visitor.module(module);
  return {
    symbols: visitor.symbolsTable,
    module: module as any as ModuleElem<ST>,
  };
}
function walkFunctionParams(
  params: FunctionParam<PT>[],
  visitor: BindSymbolsVisitor,
) {
  for (const param of params) {
    if (visitor.evaluateIfAttribute(param.attributes) === false) continue;
    param.attributes?.forEach(v => visitor.attribute(v));
    visitor.expression(param.type);
    visitor.addDeclaration(param.name); // The name is added *after* the rest of the declaration
  }
}
