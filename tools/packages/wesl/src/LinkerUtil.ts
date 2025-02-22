import { srcLog } from "mini-parse";
import {
  AbstractElem,
  AttributeElem,
  CompoundStatement,
  ContainerElem,
  DeclIdentElem,
  GlobalDeclarationElem,
  ModuleElem,
  RefIdentElem,
  Statement,
} from "./AbstractElems.ts";
import { ExpressionElem } from "./parse/ExpressionElem.ts";
import { DirectiveElem } from "./parse/DirectiveElem.ts";
import { ImportElem } from "./parse/ImportElems.ts";
import { assertUnreachable } from "./Assertions.ts";

export interface AstVisitor {
  import?: (importElem: ImportElem) => void;
  directive?: (directive: DirectiveElem) => void;
  attribute?: (attribute: AttributeElem) => void;
  globalDeclaration?: (declaration: GlobalDeclarationElem) => void;
  statement?: (statement: Statement) => void;
  /** Return false to skip the children. */
  expression?: (expression: ExpressionElem) => boolean;
}

export function visitAst(module: ModuleElem, visitor: AstVisitor) {
  for (const importElem of module.imports) {
    visitor.import?.(importElem);
  }
  for (const directive of module.directives) {
    handleAttributes(directive.attributes, visitor);
    visitor.directive?.(directive);
  }
  for (const declaration of module.declarations) {
    handleDeclaration(declaration, visitor);
  }
}

function handleAttributes(
  attributes: AttributeElem[] | undefined,
  visitor: AstVisitor,
) {
  attributes?.forEach(attribute => visitor.attribute?.(attribute));
}

function handleDeclaration(
  declaration: GlobalDeclarationElem,
  visitor: AstVisitor,
) {
  handleAttributes(declaration.attributes, visitor);
  visitor.globalDeclaration?.(declaration);

  const kind = declaration.kind;
  if (kind === "alias") {
    handleExpression(declaration.type, visitor);
  } else if (kind === "assert") {
    handleExpression(declaration.expression, visitor);
  } else if (kind === "declaration") {
    if (declaration.type) {
      handleExpression(declaration.type, visitor);
    }
    if (declaration.initializer !== undefined) {
      handleExpression(declaration.initializer, visitor);
    }
  } else if (kind === "function") {
    declaration.params.forEach(p => {
      handleAttributes(p.attributes, visitor);
      handleExpression(p.type, visitor);
    });
    handleAttributes(declaration.returnAttributes, visitor);
    if (declaration.returnType) {
      handleExpression(declaration.returnType, visitor);
    }
    handleStatement(declaration.body, visitor);
  } else if (kind === "struct") {
    declaration.members.forEach(member => {
      declaration.attributes?.forEach(attribute =>
        visitor.attribute?.(attribute),
      );
      handleExpression(member.type, visitor);
    });
  } else {
    assertUnreachable(kind);
  }
}

function handleExpression(
  expression: ExpressionElem,
  visitor: AstVisitor,
): void {
  const result = visitor?.expression?.(expression);
  if (result === false) return;
  const kind = expression.kind;
  if (kind === "binary-expression") {
    handleExpression(expression.left, visitor);
    handleExpression(expression.right, visitor);
  } else if (kind === "call-expression") {
    handleExpression(expression.function, visitor);
    expression.arguments.forEach(arg => handleExpression(arg, visitor));
  } else if (kind === "component-expression") {
    handleExpression(expression.base, visitor);
    handleExpression(expression.access, visitor);
  } else if (kind === "component-member-expression") {
    handleExpression(expression.base, visitor);
  } else if (kind === "literal" || kind === "name") {
    // Nothing to do
  } else if (kind === "parenthesized-expression") {
    handleExpression(expression.expression, visitor);
  } else if (kind === "templated-ident") {
    expression.template?.forEach(v => handleExpression(v, visitor));
  } else if (kind === "unary-expression") {
    handleExpression(expression.expression, visitor);
  } else {
    assertUnreachable(kind);
  }
}

export function identElemLog(
  identElem: DeclIdentElem | RefIdentElem,
  ...messages: any[]
): void {
  srcLog(identElem.srcModule.src, identElem.span, ...messages);
}
function handleStatement(statement: Statement, visitor: AstVisitor) {
  visitor.statement?.(statement);
  const kind = statement.kind;
  if (kind === "assert") {
  } else if (kind === "assignment-statement") {
  } else if (kind === "break-statement") {
  } else if (kind === "call-statement") {
  } else if (kind === "compound-statement") {
  } else if (kind === "continue-statement") {
  } else if (kind === "declaration") {
  } else if (kind === "decrement-statement") {
  } else if (kind === "discard-statement") {
  } else if (kind === "for-statement") {
  } else if (kind === "if-else-statement") {
  } else if (kind === "increment-statement") {
  } else if (kind === "loop-statement") {
  } else if (kind === "return-statement") {
  } else if (kind === "switch-statement") {
  } else if (kind === "while-statement") {
  } else {
    assertUnreachable(kind);
  }
}
