import type {
  GlobalDeclarationElem,
  IdentElem,
  ModuleElem,
  Statement,
  Transform,
} from "../AbstractElems";
import {
  AstVisitor,
  walkAst,
  walkAttributes,
  walkGlobalDeclarationInner,
  walkImport,
  walkStatementInner,
} from "../AstVisitor";
import { PT } from "../parse/BaseGrammar";
import { ExpressionElem } from "../parse/ExpressionElem";
import { ImportElem } from "../parse/ImportElems";

/** After we're done with the symbols table, we have idents that point at the symbols table. */
export interface ST extends Transform {
  ident: number;
}

export type SymbolsTable = {
  /** The name is either a string, or refers to a different symbol */
  name: SymbolReference;
}[];

/** decls currently visible in this scope */
interface LiveDecls {
  /** decls currently visible in this scope */
  decls: Map<string, DeclIdent>;

  /** live decls in the parent scope. null for the modue root scope */
  parent?: LiveDecls | null;
}

/**
 * Goals:
 * - link references identifiers to their declaration identifiers
 * - produce a list of symbols that can be mangled
 *
 * When iterating through the idents inside a scope, we maintain a parallel data structure of
 * 'liveDecls', the declarations that are visible in the current scope at the currently
 * processed ident, along with a link to parent liveDecls for their current decl visibility.
 */
class GenerateScopesVisitor extends AstVisitor<PT> {
  public symbolsTable: SymbolsTable = [];
  constructor() {
    super();
  }

  import(importElem: ImportElem): void {
    walkImport(importElem, this);
    // importElem.imports.
    // TODO: Emit all the imports
  }

  globalDeclarationInner(declaration: GlobalDeclarationElem): void {
    const handleDeclIdent = (ident: IdentElem) => {
      const decl: DeclIdent = {
        kind: "decl",
        originalName: ident.name,
        declElem: declaration,
        srcModule: this.srcModule,
      };
      this.rootScope.idents.push(decl);
      ident.scopeIdent = decl;
    };

    const kind = declaration.kind;
    if (kind === "alias") {
      handleDeclIdent(declaration.name);
      walkGlobalDeclarationInner(declaration, this);
    } else if (kind === "assert") {
      walkGlobalDeclarationInner(declaration, this);
    } else if (kind === "declaration") {
      handleDeclIdent(declaration.name);
      walkGlobalDeclarationInner(declaration, this);
    } else if (kind === "function") {
      handleDeclIdent(declaration.name);
      const prevScope = this.currentScope;
      this.currentScope = attachScope(prevScope);
      // TODO: Function arguments
      // TODO: Function body without an extra scope
      this.currentScope = prevScope;
    } else if (kind === "struct") {
      handleDeclIdent(declaration.name);
      walkGlobalDeclarationInner(declaration, this);
    } else {
      assertUnreachable(kind);
    }
  }

  statementInner(statement: Statement): void {
    if (statement.kind === "for-statement") {
      const prevScope = this.currentScope;
      this.currentScope = attachScope(prevScope);
      if (statement.initializer !== undefined) {
        this.statement(statement.initializer);
      }
      if (statement.condition !== undefined) {
        this.expression(statement.condition);
      }
      if (statement.update !== undefined) {
        this.statement(statement.update);
      }
      // The body shouldn't introduce a new scope.
      walkAttributes(statement.body.attributes, this);
      statement.body.body.forEach(v => this.statement(v));
      this.currentScope = prevScope;
    } else if (statement.kind === "declaration") {
      // TODO:
    } else if (statement.kind === "compound-statement") {
      const prevScope = this.currentScope;
      this.currentScope = attachScope(prevScope);
      // TODO: Walk over the compound statement body
      this.currentScope = prevScope;
    } else {
      walkStatementInner(statement, this);
    }
  }

  expression(expression: ExpressionElem): void {
    if (expression.kind === "templated-ident") {
      const originalName =
        expression.path !== undefined ?
          [...expression.path, expression.ident].map(v => v.name).join("::")
        : expression.ident.name;
      const refIdent: RefIdent = {
        kind: "ref",
        originalName,
      };
      this.currentScope.idents.push(refIdent);
      expression.ident.scopeIdent = refIdent;

      expression.template?.forEach(v => this.expression(v));
    }
  }
}

export function generateScopes(module: ModuleElem<PT>): {
  module: ModuleElem<ST>;
  symbols: SymbolsTable;
} {
  const visitor = new GenerateScopesVisitor(module);
  walkAst(module, visitor);
  return {
    module: module as any as ModuleElem<ST>,
    symbols: visitor.symbolsTable,
  };
}
