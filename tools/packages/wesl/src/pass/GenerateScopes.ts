import { assertUnreachable } from "../../../mini-parse/src/Assertions";
import type {
  GlobalDeclarationElem,
  IdentElem,
  ModuleElem,
  Statement,
} from "../AbstractElems";
import {
  AstVisitor,
  walkAst,
  walkAttributes,
  walkGlobalDeclarationInner,
  walkImport,
  walkStatementInner,
} from "../AstVisitor";
import { ExpressionElem } from "../parse/ExpressionElem";
import { ImportElem } from "../parse/ImportElems";
import {
  attachScope,
  DeclIdent,
  emptyScope,
  RefIdent,
  SrcModule,
  type Scope,
} from "../Scope";

class GenerateScopesVisitor extends AstVisitor {
  public rootScope: Scope;
  currentScope: Scope;
  constructor(public srcModule: SrcModule) {
    super();
    this.rootScope = emptyScope(null);
    this.currentScope = this.rootScope;
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

export function generateScopes(
  module: ModuleElem,
  srcModule: SrcModule,
): Scope {
  const visitor = new GenerateScopesVisitor(srcModule);
  walkAst(module, visitor);
  return visitor.rootScope;
}
