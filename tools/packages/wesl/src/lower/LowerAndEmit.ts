import { SrcMapBuilder } from "mini-parse";
import { Conditions, evaluateIfAttribute } from "../Conditions";
import { WeslAST } from "../Module";
import {
  AliasElem,
  AttributeElem,
  ConstAssertElem,
  DeclarationElem,
  DeclIdent,
  FunctionDeclarationElem,
  GlobalDeclarationElem,
  ModuleElem,
  StructElem,
} from "../parse/WeslElems";
import { ManglerFn } from "../Mangler";
import { DirectiveElem } from "../parse/DirectiveElem";
import { assertUnreachable } from "../Assertions";
import { getSymbol, SymbolTable } from "../pass/SymbolsTablePass";
import { assertThat } from "../../../mini-parse/src/Assertions";
import { str } from "../Util";

/** passed to the emitters */
interface EmitContext {
  /** constructing the linked output */
  srcBuilder: SrcMapBuilder;
  opts: EmitOptions;
}

export interface EmitOptions {
  conditions: Conditions;
  isRoot: boolean;
  tables: SymbolTable[];
  tableId: number;
}

/** traverse the AST, starting from root elements, emitting wgsl for each */
export function lowerAndEmit(
  module: ModuleElem,
  srcBuilder: SrcMapBuilder,
  opts: EmitOptions,
) {
  emitModule(module, { srcBuilder, opts });
}

function emitModule(module: ModuleElem, ctx: EmitContext): void {
  if (ctx.opts.isRoot) {
    for (const directive of module.directives) {
      emitDirective(directive, ctx);
    }
  }
  for (const decl of module.declarations) {
    emitDecl(decl, ctx);
  }
}

function emitDecl(e: GlobalDeclarationElem, ctx: EmitContext): void {
  if (!evaluateIfAttribute(ctx.opts.conditions, e.attributes)) {
    return;
  }

  emitAttributes(e.attributes, ctx);
  if (e.kind === "alias") {
    emitAlias(e, ctx);
  } else if (e.kind === "assert") {
    emitAssert(e, ctx);
  } else if (e.kind === "declaration") {
    emitDeclaration(e, ctx);
  } else if (e.kind === "function") {
    emitFunction(e, ctx);
  } else if (e.kind === "struct") {
    emitStruct(e, ctx);
  } else {
    assertUnreachable(e);
  }
}
function emitAlias(e: AliasElem, ctx: EmitContext) {
  ctx.srcBuilder.addRange("alias", e.span[0]);
  ctx.srcBuilder.addSynthetic(" ");
  emitDeclIdent(e.name, ctx);
  ctx.srcBuilder.addSynthetic(" = ");
  emitTemplatedIdentElem(e.type, ctx);
  ctx.srcBuilder.addRange(";", e.span[1] - 1);
  ctx.srcBuilder.addSynthetic("\n");
}

function emitAssert(e: ConstAssertElem, ctx: EmitContext) {
  throw new Error("Function not implemented.");
}

function emitDeclaration(e: DeclarationElem, ctx: EmitContext) {
  throw new Error("Function not implemented.");
}

function emitFunction(e: FunctionDeclarationElem, ctx: EmitContext) {
  throw new Error("Function not implemented.");
}

function emitStruct(e: StructElem, ctx: EmitContext) {
  throw new Error("Function not implemented.");
}

function lowerAndEmitElem(e: AbstractElem, ctx: EmitContext): void {
  switch (e.kind) {
    // terminal elements copy strings to the output
    case "text":
      return emitText(e, ctx);
    case "name":
      return emitName(e, ctx);
    case "synthetic":
      return emitSynthetic(e, ctx);

    // identifiers are copied to the output, but with potentially mangled names
    case "ref":
      return emitRefIdent(e, ctx);
    case "decl":
      return emitDeclIdent(e, ctx);

    // container elements just emit their child elements
    case "param":
    case "var":
    case "typeDecl":
    case "let":
    case "member":
    case "type":
    case "stuff":
      return emitContents(e, ctx);

    case "module":
      return emitModule(e, ctx);

    // root level container elements get some extra newlines to make the output prettier
    case "fn":
    case "struct":
    case "override":
    case "const":
    case "assert":
    case "alias":
    case "gvar":
      if (ctx.extracting) {
        ctx.srcBuilder.addNl();
        ctx.srcBuilder.addNl();
      }
      return emitContents(e, ctx);

    case "attribute":
      return emitAttribute(e, ctx);

    default:
      assertUnreachable(e);
  }
}

// TODO: Remove this (once we've got our entire AST parsing)
export function emitText(e: TextElem, ctx: EmitContext): void {
  ctx.srcBuilder.addCopy(e.span);
}

export function emitName(e: NameElem, ctx: EmitContext): void {
  ctx.srcBuilder.add(e.name, e.span);
}

export function emitSynthetic(e: SyntheticElem, ctx: EmitContext): void {
  const { text } = e;
  ctx.srcBuilder.addSynthetic(text, text, [0, text.length]);
}

export function emitContents(elem: ContainerElem, ctx: EmitContext): void {
  elem.contents.forEach(e => lowerAndEmitElem(e, ctx));
}

export function emitModule(elem: ModuleElem, ctx: EmitContext): void {
  elem.directives.forEach(e => emitDirective(e, ctx));
  elem.declarations.forEach(e => lowerAndEmitElem(e, ctx));

  // TODO: Remove
  elem.contents.forEach(e => lowerAndEmitElem(e, ctx));
}

export function emitRefIdent(e: RefIdentElem, ctx: EmitContext): void {
  if (e.ident.std) {
    ctx.srcBuilder.add(e.ident.originalName, e.span);
  } else {
    const declIdent = findDecl(e.ident);
    const mangledName = displayName(declIdent);
    ctx.srcBuilder.add(mangledName!, e.span);
  }
}

function emitDeclIdent(e: DeclIdent, ctx: EmitContext): void {
  if (e.symbolRef === null) {
    ctx.srcBuilder.add(e.name, e.span, true);
  } else {
    const symbol = getSymbol(ctx.opts.tables, ctx.opts.tableId, e.symbolRef);
    assertThat(
      symbol.kind === "name",
      "Compilation step should have resolved this import",
    );
    ctx.srcBuilder.add(symbol.value, e.span, true);
  }
}

function emitAttributes(
  e: AttributeElem[] | undefined,
  ctx: EmitContext,
): void {
  e?.forEach(v => emitAttribute(v, ctx));
}

function emitAttribute(e: AttributeElem, ctx: EmitContext): void {
  const { kind } = e.attribute;
  if (kind === "attribute") {
    const { params } = e.attribute;
    if (params.length === 0) {
      ctx.srcBuilder.add(str`@${e.attribute.name}`, e.span);
    } else {
      ctx.srcBuilder.add(str`@${e.attribute.name}(`, [e.span[0], params[0]);
      ctx.srcBuilder.add(
        "@" +
          e.attribute.name +
          "(" +
          params.map(expressionToString).join(", ") +
          ")",
        e.span,
      );
      ctx.srcBuilder.addRange(")", e.span[1] - 1);
    }
  } else if (kind === "@builtin") {
    ctx.srcBuilder.add("@builtin(" + e.attribute.param.name + ")", e.span);
  } else if (kind === "@diagnostic") {
    ctx.srcBuilder.add(
      "@diagnostic" +
        diagnosticControlToString(e.attribute.severity, e.attribute.rule),
      e.span,
    );
  } else if (kind === "@if") {
    ctx.srcBuilder.add(
      `@if(${expressionToString(e.attribute.param.expression)})`,
      e.span,
    );
  } else if (kind === "@interpolate") {
    ctx.srcBuilder.add(
      `@interpolate(${e.attribute.params.map(v => v.name).join(", ")})`,
      e.span,
    );
  } else {
    assertUnreachable(kind);
  }
}

export function diagnosticControlToString(
  severity: NameElem,
  rule: [NameElem, NameElem | null],
): string {
  const ruleStr = rule[0].name + (rule[1] !== null ? "." + rule[1].name : "");
  return `(${severity.name}, ${ruleStr})`;
}

export function expressionToString(elem: ExpressionElem): string {
  const { kind } = elem;
  if (kind === "binary-expression") {
    return `${expressionToString(elem.left)} ${elem.operator.value} ${expressionToString(elem.right)}`;
  } else if (kind === "unary-expression") {
    return `${elem.operator.value}${expressionToString(elem.expression)}`;
  } else if (kind === "templated-ident") {
    return templatedIdentToString(elem);
  } else if (kind === "literal") {
    return elem.value;
  } else if (kind === "name") {
    return elem.name;
  } else if (kind === "parenthesized-expression") {
    return `(${expressionToString(elem.expression)})`;
  } else if (kind === "component-expression") {
    return `${expressionToString(elem.base)}[${expressionToString(elem.access)}]`;
  } else if (kind === "component-member-expression") {
    return `${expressionToString(elem.base)}.${elem.access.name}`;
  } else if (kind === "call-expression") {
    return `${expressionToString(elem.function)}(${elem.arguments.map(expressionToString).join(", ")})`;
  } else {
    assertUnreachable(kind);
  }
}

export function templatedIdentToString(elem: TemplatedIdentElem): string {
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

export function lhsExpressionToString(elem: LhsExpression): string {
  const { kind } = elem;
  if (kind === "unary-expression") {
    return `${elem.operator.value}${lhsExpressionToString(elem.expression)}`;
  } else if (kind === "lhs-ident") {
    return elem.name.name;
  } else if (kind === "parenthesized-expression") {
    return `(${lhsExpressionToString(elem.expression)})`;
  } else if (kind === "component-expression") {
    return `${lhsExpressionToString(elem.base)}[${expressionToString(elem.access)}]`;
  } else if (kind === "component-member-expression") {
    return `${lhsExpressionToString(elem.base)}.${elem.access.name}`;
  } else {
    assertUnreachable(kind);
  }
}

function templateToString(template: ExpressionElem[] | undefined): string {
  if (template === undefined) return "";
  if (template.length === 0) return "";

  return "<" + template.map(expressionToString).join(", ") + ">";
}

function emitDirective(e: DirectiveElem, ctx: EmitContext): void {
  const { directive } = e;
  const { kind } = directive;
  if (kind === "diagnostic") {
    ctx.srcBuilder.add(
      `diagnostic${diagnosticControlToString(directive.severity, directive.rule)};`,
      e.span,
    );
  } else if (kind === "enable") {
    ctx.srcBuilder.add(
      `enable ${directive.extensions.map(v => v.name).join(", ")};`,
      e.span,
    );
  } else if (kind === "requires") {
    ctx.srcBuilder.add(
      `requires ${directive.extensions.map(v => v.name).join(", ")};`,
      e.span,
    );
  } else {
    assertUnreachable(kind);
  }
}

function displayName(declIdent: DeclIdent): string {
  if (isGlobal(declIdent)) {
    // mangled name was set in binding step
    const mangledName = declIdent.mangledName;
    if (tracing && !mangledName) {
      console.log(
        "ERR: mangled name not found for decl ident",
        identToString(declIdent),
      );
    }
    return mangledName!;
  }

  return declIdent.mangledName || declIdent.originalName;
}

function findDecl(ident: any) {
  throw new Error("Function not implemented.");
}

function isGlobal(declIdent: DeclIdent) {
  throw new Error("Function not implemented.");
}

function identToString(declIdent: DeclIdent): any {
  throw new Error("Function not implemented.");
}
