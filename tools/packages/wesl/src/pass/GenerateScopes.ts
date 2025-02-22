import { assertUnreachable } from "../../../mini-parse/src/Assertions";
import type {
  AttributeElem,
  GlobalDeclarationElem,
  IdentElem,
  ModuleElem,
} from "../AbstractElems";
import { visitAst } from "../LinkerUtil";
import { ExpressionElem } from "../parse/ExpressionElem";
import { ImportElem } from "../parse/ImportElems";
import { DeclIdent, emptyScope, SrcModule, type Scope } from "../Scope";

export function generateScopes(
  module: ModuleElem,
  srcModule: SrcModule,
): Scope {
  const rootScope = emptyScope(null);
  visitAst(module, {});
  for (const importElem of module.imports) {
    handleImportElem(importElem, rootScope);
  }
  for (const directive of module.directives) {
    handleAttributes(directive.attributes, rootScope);
  }
  for (const declaration of module.declarations) {
    handleDeclaration(declaration, rootScope, srcModule);
  }

  return rootScope;
}

function handleAttributes(
  attributes: AttributeElem[] | undefined,
  scope: Scope,
) {
  if (attributes === undefined) return;
  for (const { attribute } of attributes) {
    if (attribute.kind === "attribute") {
      attribute.params.forEach(expression =>
        handleExpression(expression, scope),
      );
    } else if (
      attribute.kind === "@builtin" ||
      attribute.kind === "@diagnostic" ||
      attribute.kind === "@if" ||
      attribute.kind === "@interpolate"
    ) {
      // Nothing to do
    } else {
      assertUnreachable(attribute);
    }
  }
}
function handleDeclaration(
  declaration: GlobalDeclarationElem,
  rootScope: Scope,
  srcModule: SrcModule,
) {
  const handleDeclIdent = (ident: IdentElem) => {
    const decl: DeclIdent = {
      kind: "decl",
      originalName: ident.name,
      declElem: declaration,
      srcModule,
    };
    rootScope.idents.push(decl);
    ident.scopeIdent = decl;
  };

  handleAttributes(declaration.attributes, rootScope);
  const kind = declaration.kind;
  if (kind === "alias") {
    handleDeclIdent(declaration.name);
    handleExpression(declaration.type, rootScope);
  } else if (kind === "assert") {
    handleExpression(declaration.expression, rootScope);
  } else if (kind === "declaration") {
    handleDeclIdent(declaration.name);
    if (declaration.type) {
      handleExpression(declaration.type, rootScope);
    }
    if (declaration.initializer !== undefined) {
      handleExpression(declaration.initializer, rootScope);
    }
  } else if (kind === "function") {
    // TODO:
  } else if (kind === "struct") {
    handleDeclIdent(declaration.name);
    declaration.members.forEach(member => {
      handleAttributes(member.attributes, rootScope);
      handleExpression(member.type, rootScope);
    });
  } else {
    assertUnreachable(kind);
  }
}

function handleExpression(expression: ExpressionElem, scope: Scope): void {
  const kind = expression.kind;
  if (kind === "binary-expression") {
    handleExpression(expression.left, scope);
    handleExpression(expression.right, scope);
  } else if (kind === "call-expression") {
    handleExpression(expression.function, scope);
    expression.arguments.forEach(arg => handleExpression(arg, scope));
  } else if (kind === "component-expression") {
    handleExpression(expression.base, scope);
    handleExpression(expression.access, scope);
  } else if (kind === "component-member-expression") {
    handleExpression(expression.base, scope);
  } else if (kind === "literal" || kind === "name") {
    // Nothing to do
  } else if (kind === "parenthesized-expression") {
    handleExpression(expression.expression, scope);
  } else if (kind === "templated-ident") {
    // TODO:
  } else if (kind === "unary-expression") {
    handleExpression(expression.expression, scope);
  } else {
    assertUnreachable(kind);
  }
}
function handleImportElem(importElem: ImportElem, rootScope: Scope) {
  handleAttributes(importElem.attributes, rootScope);
  // importElem.imports.
  // TODO: Emit all the imports
}
