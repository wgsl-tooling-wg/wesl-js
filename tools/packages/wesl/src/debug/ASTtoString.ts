import {
  AbstractElem,
  Attribute,
  AttributeElem,
  CompoundStatement,
  ConstAssertElem,
  DeclarationElem,
  FunctionDeclarationElem,
  GlobalDeclarationElem,
  ModuleElem,
  Statement,
  StuffElem,
  TypedDeclElem,
  TypeRefElem,
  TypeTemplateParameter,
} from "../AbstractElems.ts";
import { assertUnreachable } from "../Assertions.ts";
import {
  diagnosticControlToString,
  expressionToString,
  lhsExpressionToString,
} from "../LowerAndEmit.ts";
import {
  DiagnosticDirective,
  DirectiveElem,
  EnableDirective,
  RequiresDirective,
} from "../parse/DirectiveElem.ts";
import { ExpressionElem, TemplatedIdentElem } from "../parse/ExpressionElem.ts";
import { ImportElem } from "../parse/ImportElems.ts";
import { importToString } from "./ImportToString.ts";
import { LineWrapper } from "./LineWrapper.ts";

const maxLineLength = 150;

export function astToString(ast: ModuleElem, indent = 0): string {
  const str = new LineWrapper(indent);
  str.add("module");
  for (const importElem of ast.imports) {
    printImportElem(importElem, str.indentedBlock(2));
  }
  for (const directive of ast.directives) {
    printDirectiveElem(directive, str.indentedBlock(2));
  }
  for (const decl of ast.declarations) {
    printGlobalDecl(decl, str.indentedBlock(2));
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
    str.add("alias " + elem.name.name);
    str.add("=" + templatedIdentToString(elem.type));
  } else if (kind === "assert") {
    printConstAssert(elem, str);
  } else if (kind === "declaration") {
    printDeclaration(elem, str);
  } else if (kind === "function") {
    printFunction(elem, str);
  } else if (kind === "struct") {
    str.add("struct " + elem.name.name);
    const childPrinter = str.indentedBlock(2);
    for (const member of elem.members) {
      printAttributes(member.attributes, str);
      childPrinter.add(member.name.name);
      childPrinter.add(": " + templatedIdentToString(member.type));
      childPrinter.nl();
    }
  } else {
    assertUnreachable(kind);
  }
  str.nl();
}

function printConstAssert(elem: ConstAssertElem, str: LineWrapper) {
  str.add("const_assert(");
  str.add(expressionToString(elem.expression));
  str.add(")");
}

function printImportElem(elem: ImportElem, str: LineWrapper) {
  printAttributes(elem.attributes, str);
  str.add(importToString(elem.imports));
}

function printAttributes(elems: AttributeElem[] | undefined, str: LineWrapper) {
  if (elems === undefined || elems.length === 0) return;
  for (let i = 0; i < elems.length - 1; i++) {
    printAttribute(elems[i].attribute, str);
    str.add(" ");
  }
  printAttribute(elems[elems.length - 1].attribute, str);
  str.nl();
}

function printAttribute(elem: Attribute, str: LineWrapper) {
  const { kind } = elem;
  if (kind === "attribute") {
    const { name, params } = elem;
    if (params.length > 0) {
      str.add("@" + name + "(");
      printExpressions(params, str);
      str.add(")");
    } else {
      str.add("@" + name);
    }
  } else if (kind === "@builtin") {
    str.add(` @builtin(${elem.param.name})`);
  } else if (kind === "@diagnostic") {
    str.add(
      ` @diagnostic${diagnosticControlToString(elem.severity, elem.rule)}`,
    );
  } else if (kind === "@if") {
    str.add("@if");
    str.add("(");
    str.add(expressionToString(elem.param.expression));
    str.add(")");
  } else if (kind === "@interpolate") {
    str.add("@interpolate(");
    printExpressions(elem.params, str);
    str.add(")");
  } else {
    assertUnreachable(kind);
  }
}

function printExpressions(expressions: ExpressionElem[], str: LineWrapper) {
  if (expressions.length === 0) return;
  for (let i = 0; i < expressions.length - 1; i++) {
    str.add(expressionToString(expressions[i]) + ", ");
  }
  str.add(expressionToString(expressions[expressions.length - 1]));
}

function printDirectiveElem(elem: DirectiveElem, str: LineWrapper) {
  printAttributes(elem.attributes, str);
  printDirective(elem.directive, str);
}

function printDirective(
  elem: DiagnosticDirective | EnableDirective | RequiresDirective,
  str: LineWrapper,
) {
  const { kind } = elem;
  if (kind === "diagnostic") {
    str.add(`diagnostic${diagnosticControlToString(elem.severity, elem.rule)}`);
  } else if (kind === "enable") {
    str.add(`enable ${elem.extensions.map(v => v.name).join(", ")}`);
  } else if (kind === "requires") {
    str.add(`requires${elem.extensions.map(v => v.name).join(", ")}`);
  } else {
    assertUnreachable(kind);
  }
}

function templatedIdentToString(elem: TemplatedIdentElem): string {
  let name = elem.ident.name;
  if (elem.path !== undefined && elem.path.length > 0) {
    name = elem.path.map(p => p.name).join("::") + "::" + name;
  }
  let params = "";
  if (elem.template !== undefined) {
    const paramStrs = elem.template.map(expressionToString).join(", ");
    params = "<" + paramStrs + ">";
  }
  return name + params;
}

function printDeclaration(elem: DeclarationElem, str: LineWrapper) {
  str.add(elem.variant.kind);
  str.add(" " + elem.name.name);
  if (elem.type) {
    str.add(" : " + templatedIdentToString(elem.type));
  }
  if (elem.initializer) {
    str.add(" = ");
    str.add(expressionToString(elem.initializer));
  }
}

function printFunction(elem: FunctionDeclarationElem, str: LineWrapper) {
  str.add("fn " + elem.name.name);
  str.add("(");
  const paramsStr = elem.params
    .map(p => p.name.kind + ": " + templatedIdentToString(p.type))
    .join(", ");
  str.add(paramsStr);
  str.add(")");
  printAttributes(elem.returnAttributes, str);
  if (elem.returnType) {
    str.add(" -> " + templatedIdentToString(elem.returnType));
  }
  printStatement(elem.body, str);
}

function printStatement(stmt: Statement, str: LineWrapper) {
  printAttributes(stmt.attributes, str);
  if (stmt.kind === "compound-statement") {
    const bodyStr = str.indentedBlock(2);
    stmt.body.forEach(v => printStatement(v, bodyStr));
  } else if (stmt.kind === "assert") {
    printConstAssert(stmt, str);
  } else if (stmt.kind === "assignment-statement") {
    if (stmt.left.kind === "discard-expression") {
      str.add("_");
    } else {
      str.add(lhsExpressionToString(stmt.left));
    }
    str.add(" " + stmt.operator.value + " ");
    str.add(expressionToString(stmt.right));
  } else if (stmt.kind === "call-statement") {
    str.add(templatedIdentToString(stmt.function) + "(");
    printExpressions(stmt.arguments, str);
    str.add(")");
  } else if (stmt.kind === "declaration") {
    printDeclaration(stmt, str);
  } else if (
    stmt.kind === "break-statement" ||
    stmt.kind === "continue-statement" ||
    stmt.kind === "discard-statement"
  ) {
    str.add(stmt.kind);
  } else if (stmt.kind === "return-statement") {
    if (stmt.expression) {
      str.add("return " + expressionToString(stmt.expression));
    } else {
      str.add("return");
    }
  } else if (stmt.kind === "postfix-statement") {
    str.add(lhsExpressionToString(stmt.expression));
    str.add(stmt.operator.value);
  } else if (stmt.kind === "for-statement") {
    throw new Error("TODO:");
  } else if (stmt.kind === "if-else-statement") {
    throw new Error("TODO:");
  } else if (stmt.kind === "loop-statement") {
    throw new Error("TODO:");
  } else if (stmt.kind === "switch-statement") {
    throw new Error("TODO:");
  } else if (stmt.kind === "while-statement") {
    throw new Error("TODO:");
  } else {
    assertUnreachable(stmt);
  }
  str.nl();
}
