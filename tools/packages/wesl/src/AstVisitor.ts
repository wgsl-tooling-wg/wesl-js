import {
  AttributeElem,
  GlobalDeclarationElem,
  LhsExpression,
  ModuleElem,
  Statement,
} from "./parse/WeslElems.ts";
import { ExpressionElem } from "./parse/ExpressionElem.ts";
import { DirectiveElem } from "./parse/DirectiveElem.ts";
import { ImportElem } from "./parse/ImportElems.ts";
import { assertUnreachable } from "./Assertions.ts";

export abstract class AstVisitor {
  module(module: ModuleElem) {
    walkModule(module, this);
  }
  import(importElem: ImportElem) {
    walkImport(importElem, this);
  }
  directive(directive: DirectiveElem) {
    walkDirective(directive, this);
  }
  attribute(attribute: AttributeElem) {
    walkAttribute(attribute, this);
  }
  /** A global declaration and its attributes */
  globalDeclaration(declaration: GlobalDeclarationElem) {
    walkGlobalDeclaration(declaration, this);
  }
  /** A global declaration after the attributes */
  globalDeclarationInner(declaration: GlobalDeclarationElem) {
    walkGlobalDeclarationInner(declaration, this);
  }
  /** A statement and its attributes */
  statement(statement: Statement) {
    walkStatement(statement, this);
  }
  /** A statement after the attributes */
  statementInner(statement: Statement) {
    walkStatementInner(statement, this);
  }
  expression(expression: ExpressionElem): void {
    walkExpression(expression, this);
  }
  lhsExpression(expression: LhsExpression): void {
    walkLhsExpression(expression, this);
  }
}

export function walkModule(module: ModuleElem, visitor: AstVisitor) {
  for (const importElem of module.imports) {
    visitor.import(importElem);
  }
  for (const directive of module.directives) {
    visitor.directive(directive);
  }
  for (const declaration of module.declarations) {
    visitor.globalDeclaration(declaration);
  }
}

export function walkImport(importElem: ImportElem, visitor: AstVisitor) {
  visitAttributes(importElem.attributes, visitor);
}

export function walkDirective(directive: DirectiveElem, visitor: AstVisitor) {
  visitAttributes(directive.attributes, visitor);
}

/** Helper function so I don't have to write this out every time */
function visitAttributes(
  attributes: AttributeElem[] | undefined,
  visitor: AstVisitor,
) {
  attributes?.forEach(attribute => visitor.attribute(attribute));
}

function walkAttribute(attribute: AttributeElem, visitor: AstVisitor) {
  if (attribute.attribute.kind === "attribute") {
    attribute.attribute.params.forEach(v => visitor.expression(v));
  }
}

export function walkGlobalDeclaration(
  declaration: GlobalDeclarationElem,
  visitor: AstVisitor,
) {
  visitAttributes(declaration.attributes, visitor);
  visitor.globalDeclarationInner(declaration);
}

export function walkGlobalDeclarationInner(
  declaration: GlobalDeclarationElem,
  visitor: AstVisitor,
) {
  const kind = declaration.kind;
  if (kind === "alias") {
    visitor.expression(declaration.type);
  } else if (kind === "assert") {
    visitor.expression(declaration.expression);
  } else if (kind === "declaration") {
    if (declaration.variant.kind === "var") {
      declaration.variant.template?.forEach(v => visitor.expression(v));
    }
    if (declaration.type) {
      visitor.expression(declaration.type);
    }
    if (declaration.initializer !== undefined) {
      visitor.expression(declaration.initializer);
    }
  } else if (kind === "function") {
    declaration.params.forEach(p => {
      visitAttributes(p.attributes, visitor);
      visitor.expression(p.type);
    });
    visitAttributes(declaration.returnAttributes, visitor);
    if (declaration.returnType) {
      visitor.expression(declaration.returnType);
    }
    visitor.statement(declaration.body);
  } else if (kind === "struct") {
    declaration.members.forEach(member => {
      declaration.attributes?.forEach(attribute =>
        visitor.attribute?.(attribute),
      );
      visitor.expression(member.type);
    });
  } else {
    assertUnreachable(kind);
  }
}

export function walkExpression(
  expression: ExpressionElem,
  visitor: AstVisitor,
): void {
  const kind = expression.kind;
  if (kind === "binary-expression") {
    visitor.expression(expression.left);
    visitor.expression(expression.right);
  } else if (kind === "call-expression") {
    visitor.expression(expression.function);
    expression.arguments.forEach(arg => visitor.expression(arg));
  } else if (kind === "component-expression") {
    visitor.expression(expression.base);
    visitor.expression(expression.access);
  } else if (kind === "component-member-expression") {
    visitor.expression(expression.base);
  } else if (kind === "literal") {
    // Nothing to do
  } else if (kind === "parenthesized-expression") {
    visitor.expression(expression.expression);
  } else if (kind === "templated-ident") {
    expression.template?.forEach(v => visitor.expression(v));
  } else if (kind === "unary-expression") {
    visitor.expression(expression.expression);
  } else {
    assertUnreachable(kind);
  }
}

export function walkLhsExpression(
  expression: LhsExpression,
  visitor: AstVisitor,
): void {
  const kind = expression.kind;
  if (kind === "component-expression") {
    visitor.lhsExpression(expression.base);
    visitor.expression(expression.access);
  } else if (kind === "component-member-expression") {
    visitor.lhsExpression(expression.base);
  } else if (kind === "lhs-ident") {
    // Nothing to do
  } else if (kind === "parenthesized-expression") {
    visitor.lhsExpression(expression.expression);
  } else if (kind === "unary-expression") {
    visitor.lhsExpression(expression.expression);
  } else {
    assertUnreachable(kind);
  }
}

export function walkStatement(statement: Statement, visitor: AstVisitor) {
  visitAttributes(statement.attributes, visitor);
  visitor.statementInner(statement);
}

export function walkStatementInner(statement: Statement, visitor: AstVisitor) {
  const kind = statement.kind;
  if (kind === "assert") {
    visitor.expression(statement.expression);
  } else if (kind === "assignment-statement") {
    if (statement.left.kind !== "discard-expression") {
      visitor.lhsExpression(statement.left);
    }
    visitor.expression(statement.right);
  } else if (kind === "break-statement") {
    // Nothing to do
  } else if (kind === "call-statement") {
    visitor.expression(statement.function);
    statement.arguments.forEach(v => visitor.expression(v));
  } else if (kind === "compound-statement") {
    statement.body.forEach(v => visitor.statement(v));
  } else if (kind === "continue-statement") {
    // Nothing to do
  } else if (kind === "declaration") {
    if (statement.variant.kind === "var") {
      statement.variant.template?.forEach(v => visitor.expression(v));
    }
    if (statement.type !== undefined) {
      visitor.expression(statement.type);
    }
    if (statement.initializer !== undefined) {
      visitor.expression(statement.initializer);
    }
  } else if (kind === "postfix-statement") {
    visitor.lhsExpression(statement.expression);
  } else if (kind === "discard-statement") {
    // Nothing to do
  } else if (kind === "for-statement") {
    if (statement.initializer !== undefined) {
      visitor.statement(statement.initializer);
    }
    if (statement.condition !== undefined) {
      visitor.expression(statement.condition);
    }
    if (statement.update !== undefined) {
      visitor.statement(statement.update);
    }
    visitor.statement(statement.body);
  } else if (kind === "if-else-statement") {
    let current = statement.main;
    while (true) {
      visitor.expression(current.condition);
      visitor.statement(current.accept);
      if (current.reject === undefined) {
        break;
      } else if (current.reject.kind === "if-clause") {
        current = current.reject;
      } else {
        visitor.statement(current.reject);
        break;
      }
    }
  } else if (kind === "loop-statement") {
    visitor.statement(statement.body);
    if (statement.continuing !== undefined) {
      visitAttributes(statement.continuing.attributes, visitor);
      visitor.statement(statement.continuing.body);
      const breakIf = statement.continuing.breakIf;
      if (breakIf !== undefined) {
        visitAttributes(breakIf.attributes, visitor);
        visitor.expression(breakIf.expression);
      }
    }
  } else if (kind === "return-statement") {
    if (statement.expression !== undefined) {
      visitor.expression(statement.expression);
    }
  } else if (kind === "switch-statement") {
    visitor.expression(statement.selector);
    visitAttributes(statement.bodyAttributes, visitor);
    for (const clause of statement.clauses) {
      visitAttributes(clause.attributes, visitor);
      for (const switchCase of clause.cases) {
        if (switchCase.expression === "default") {
          // Nothing to do
        } else {
          visitor.expression(switchCase.expression);
        }
      }
      visitor.statement(clause.body);
    }
  } else if (kind === "while-statement") {
    visitor.expression(statement.condition);
    visitor.statement(statement.body);
  } else {
    assertUnreachable(kind);
  }
}
