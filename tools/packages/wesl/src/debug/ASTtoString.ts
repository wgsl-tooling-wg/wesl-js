import {
  Attribute,
  AttributeElem,
  ConstAssertElem,
  DeclarationElem,
  FunctionDeclarationElem,
  GlobalDeclarationElem,
  IfClause,
  ModuleElem,
  Statement,
  SwitchCaseSelector,
} from "../parse/WeslElems.ts";
import { assertThat, assertUnreachable } from "../Assertions.ts";
import {
  diagnosticControlToString,
  expressionToString,
  lhsExpressionToString,
  templatedIdentToString,
} from "../LowerAndEmit.ts";
import {
  DiagnosticDirective,
  DirectiveElem,
  EnableDirective,
  RequiresDirective,
} from "../parse/DirectiveElem.ts";
import { ExpressionElem } from "../parse/ExpressionElem.ts";
import { ImportElem } from "../parse/ImportElems.ts";
import { importToString } from "./ImportToString.ts";
import { LineWrapper } from "./LineWrapper.ts";

const maxLineLength = 150;

export function astToString(ast: ModuleElem, indent = 0): string {
  const str = new LineWrapper(indent);
  str.add`module`;
  str.nl();
  const moduleStr = str.indentedBlock(2);
  for (const importElem of ast.imports) {
    printImportElem(importElem, moduleStr);
  }
  for (const directive of ast.directives) {
    printDirectiveElem(directive, moduleStr);
  }
  for (const decl of ast.declarations) {
    printGlobalDecl(decl, moduleStr);
  }
  return str.print(maxLineLength);
}

export function globalDeclToString(
  elem: GlobalDeclarationElem,
  indent = 0,
): string {
  const str = new LineWrapper(indent);
  printGlobalDecl(elem, str);
  return str.print(maxLineLength);
}

function printGlobalDecl(elem: GlobalDeclarationElem, str: LineWrapper): void {
  const { kind } = elem;
  printAttributes(elem.attributes, str);
  if (kind === "alias") {
    str.add`alias ${elem.name.name}`;
    str.add` = ${templatedIdentToString(elem.type)}`;
    str.nl();
  } else if (kind === "assert") {
    printConstAssert(elem, str);
    str.nl();
  } else if (kind === "declaration") {
    printDeclaration(elem, str);
    str.nl();
  } else if (kind === "function") {
    printFunction(elem, str);
  } else if (kind === "struct") {
    str.add`struct ${elem.name.name}`;
    str.nl();
    const childPrinter = str.indentedBlock(2);
    for (const member of elem.members) {
      printAttributes(member.attributes, childPrinter);
      childPrinter.add`${member.name.name}`;
      childPrinter.add`: ${templatedIdentToString(member.type)}`;
      childPrinter.nl();
    }
  } else {
    assertUnreachable(kind);
  }
}

/** Does not include the new line */
function printConstAssert(elem: ConstAssertElem, str: LineWrapper) {
  str.add`const_assert `;
  str.add`${expressionToString(elem.expression)}`;
}

function printImportElem(elem: ImportElem, str: LineWrapper) {
  printAttributes(elem.attributes, str);
  str.add`${importToString(elem.imports)}`;
  str.nl();
}

function printAttributes(elems: AttributeElem[] | undefined, str: LineWrapper) {
  if (elems === undefined || elems.length === 0) return;
  for (let i = 0; i < elems.length - 1; i++) {
    printAttribute(elems[i].attribute, str);
    str.add` `;
  }
  printAttribute(elems[elems.length - 1].attribute, str);
  str.nl();
}

function printAttribute(elem: Attribute, str: LineWrapper) {
  const { kind } = elem;
  if (kind === "attribute") {
    const { name, params } = elem;
    if (params.length > 0) {
      str.add`@${name}(`;
      printExpressions(params, str);
      str.add`)`;
    } else {
      str.add`@${name}`;
    }
  } else if (kind === "@builtin") {
    str.add`@builtin(${elem.param.name})`;
  } else if (kind === "@diagnostic") {
    str.add` @diagnostic${diagnosticControlToString(elem.severity, elem.rule)}`;
  } else if (kind === "@if") {
    str.add`@if`;
    str.add`(`;
    str.add`${expressionToString(elem.param.expression)}`;
    str.add`)`;
  } else if (kind === "@interpolate") {
    str.add`@interpolate(${elem.params.map(v => v.name).join(", ")})`;
  } else {
    assertUnreachable(kind);
  }
}

function printExpressions(expressions: ExpressionElem[], str: LineWrapper) {
  if (expressions.length === 0) return;
  for (let i = 0; i < expressions.length - 1; i++) {
    str.add`${expressionToString(expressions[i])}, `;
  }
  printExpression(expressions[expressions.length - 1], str);
}
function printExpression(expression: ExpressionElem, str: LineWrapper) {
  str.add`${expressionToString(expression)}`;
}

function printDirectiveElem(elem: DirectiveElem, str: LineWrapper) {
  printAttributes(elem.attributes, str);
  printDirective(elem.directive, str);
  str.nl();
}

function printDirective(
  elem: DiagnosticDirective | EnableDirective | RequiresDirective,
  str: LineWrapper,
) {
  const { kind } = elem;
  if (kind === "diagnostic") {
    str.add`diagnostic${diagnosticControlToString(elem.severity, elem.rule)}`;
  } else if (kind === "enable") {
    str.add`enable ${elem.extensions.map(v => v.name).join(", ")}`;
  } else if (kind === "requires") {
    str.add`requires${elem.extensions.map(v => v.name).join(", ")}`;
  } else {
    assertUnreachable(kind);
  }
}

/** Does not include the new line */
function printDeclaration(elem: DeclarationElem, str: LineWrapper) {
  str.add`${elem.variant.kind}`;
  str.add` ${elem.name.name}`;
  if (elem.type) {
    str.add` : ${templatedIdentToString(elem.type)}`;
  }
  if (elem.initializer) {
    str.add` = `;
    printExpression(elem.initializer, str);
  }
}

function printFunction(elem: FunctionDeclarationElem, str: LineWrapper) {
  str.add`fn ${elem.name.name}`;
  str.add`(`;
  if (
    elem.params.some(v => v.attributes !== undefined && v.attributes.length > 0)
  ) {
    // Switch to long param printing mode iff there are attributes
    str.nl();
    const paramsStr = str.indentedBlock(2);
    for (const p of elem.params) {
      printAttributes(p.attributes, paramsStr);
      paramsStr.add`${p.name.name}: ${templatedIdentToString(p.type)}`;
      paramsStr.nl();
    }
  } else {
    const paramsStr = elem.params
      .map(p => p.name.name + ": " + templatedIdentToString(p.type))
      .join(", ");
    str.add`${paramsStr}`;
  }

  str.add`)`;
  printAttributes(elem.returnAttributes, str);
  if (elem.returnType) {
    str.add` -> ${templatedIdentToString(elem.returnType)}`;
  }
  str.nl();
  printStatement(elem.body, str);
}

function printStatement(stmt: Statement, str: LineWrapper) {
  printAttributes(stmt.attributes, str);
  if (stmt.kind === "compound-statement") {
    if (stmt.body.length > 0) {
      const bodyStr = str.indentedBlock(2);
      stmt.body.forEach(v => printStatement(v, bodyStr));
    }
    return; // Skip printing the final newline
  }

  if (stmt.kind === "assert") {
    printConstAssert(stmt, str);
  } else if (stmt.kind === "assignment-statement") {
    if (stmt.left.kind === "discard-expression") {
      str.add`_`;
    } else {
      str.add`${lhsExpressionToString(stmt.left)}`;
    }
    str.add` ${stmt.operator.value} `;
    printExpression(stmt.right, str);
  } else if (stmt.kind === "call-statement") {
    str.add`${templatedIdentToString(stmt.function)}(`;
    printExpressions(stmt.arguments, str);
    str.add`)`;
  } else if (stmt.kind === "declaration") {
    printDeclaration(stmt, str);
  } else if (
    stmt.kind === "break-statement" ||
    stmt.kind === "continue-statement" ||
    stmt.kind === "discard-statement"
  ) {
    str.add`${stmt.kind}`;
  } else if (stmt.kind === "return-statement") {
    if (stmt.expression) {
      str.add`return ${expressionToString(stmt.expression)}`;
    } else {
      str.add`return`;
    }
  } else if (stmt.kind === "postfix-statement") {
    str.add`${lhsExpressionToString(stmt.expression)}`;
    str.add`${stmt.operator.value}`;
  } else if (stmt.kind === "for-statement") {
    str.add`for(`;
    str.nl();
    const childStr = str.indentedBlock(2);
    if (stmt.initializer !== undefined) {
      printStatement(stmt.initializer, childStr);
    }
    if (stmt.condition !== undefined) {
      printExpression(stmt.condition, childStr);
      childStr.nl();
    }
    if (stmt.update !== undefined) {
      printStatement(stmt.update, childStr);
    }
    str.add`)`;
    str.nl();
    printStatement(stmt.body, str);
  } else if (stmt.kind === "if-else-statement") {
    printIfClause(stmt.main, str);
  } else if (stmt.kind === "loop-statement") {
    str.add`loop`;
    str.nl();
    printStatement(stmt.body, str);
    if (stmt.continuing !== undefined) {
      const bodyStr = str.indentedBlock(2);
      printAttributes(stmt.continuing.attributes, bodyStr);
      bodyStr.add`continuing`;
      bodyStr.nl();
      printStatement(stmt.continuing.body, bodyStr);

      const breakIf = stmt.continuing.breakIf;
      if (breakIf !== undefined) {
        const continuingStr = str.indentedBlock(2);
        printAttributes(breakIf.attributes, continuingStr);
        continuingStr.add`break if ${expressionToString(breakIf.expression)}`;
        continuingStr.nl();
      }
    }
  } else if (stmt.kind === "switch-statement") {
    str.add`switch `;
    printExpression(stmt.selector, str);
    str.nl();
    printAttributes(stmt.bodyAttributes, str);
    const clauseStr = str.indentedBlock(2);
    for (const clause of stmt.clauses) {
      printAttributes(clause.attributes, clauseStr);
      assertThat(clause.cases.length > 0);
      clauseStr.add`case `;
      printSwitchCase(clause.cases[0], clauseStr);
      for (let i = 1; i < clause.cases.length; i++) {
        clauseStr.add`, `;
        printSwitchCase(clause.cases[i], clauseStr);
      }
      clauseStr.add`:`;
      clauseStr.nl();
      printStatement(clause.body, clauseStr);
    }
  } else if (stmt.kind === "while-statement") {
    str.add`while `;
    printExpression(stmt.condition, str);
    str.nl();
    printStatement(stmt.body, str);
  } else {
    assertUnreachable(stmt);
  }
  str.nl();
}

function printIfClause(clause: IfClause, str: LineWrapper) {
  str.add`if `;
  printExpression(clause.condition, str);
  str.nl();
  printStatement(clause.accept, str);
  if (clause.reject !== undefined) {
    if (clause.reject.kind === "compound-statement") {
      str.add`else`;
      str.nl();
      printStatement(clause.reject, str);
    } else {
      str.add`else `;
      printIfClause(clause.reject, str);
    }
  }
}
function printSwitchCase(switchCase: SwitchCaseSelector, str: LineWrapper) {
  if (switchCase.expression === "default") {
    str.add`default`;
  } else {
    printExpression(switchCase.expression, str);
  }
}
