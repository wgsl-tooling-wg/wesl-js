import { SrcMapBuilder, tracing } from "mini-parse";
import {
  AbstractElem,
  AttributeElem,
  ContainerElem,
  DeclIdentElem,
  LhsExpression,
  ModuleElem,
  NameElem,
  RefIdentElem,
  SyntheticElem,
} from "./AbstractElems.ts";
import { assertUnreachable } from "./Assertions.ts";
import { identToString } from "./debug/ScopeToString.ts";
import { Conditions, DeclIdent, RefIdent } from "./Scope.ts";
import { DirectiveElem } from "./parse/DirectiveElem.ts";
import { ExpressionElem, TemplatedIdentElem } from "./parse/ExpressionElem.ts";

/** passed to the emitters */
interface EmitContext {
  srcBuilder: SrcMapBuilder; // constructing the linked output
  conditions: Conditions; // settings for conditional compilation
  extracting: boolean; // are we extracting or copying the root module
}

/** traverse the AST, starting from root elements, emitting wgsl for each */
export function lowerAndEmit(
  srcBuilder: SrcMapBuilder,
  rootElems: AbstractElem[],
  conditions: Conditions,
  extracting = true,
): void {
  const emitContext: EmitContext = { conditions, srcBuilder, extracting };
  lowerAndEmitRecursive(rootElems, emitContext);
}

function lowerAndEmitRecursive(
  elems: AbstractElem[],
  emitContext: EmitContext,
): void {
  const validElems = elems.filter(e =>
    conditionsValid(e, emitContext.conditions),
  );
  validElems.forEach(e => lowerAndEmitElem(e, emitContext));
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

export function emitDeclIdent(e: DeclIdentElem, ctx: EmitContext): void {
  const mangledName = displayName(e.ident);
  ctx.srcBuilder.add(mangledName!, e.span);
}

function emitAttribute(e: AttributeElem, ctx: EmitContext): void {
  const { kind } = e.attribute;
  // LATER emit more precise source map info by making use of all the spans
  // Like the first case does
  if (kind === "attribute") {
    const { params } = e.attribute;
    if (params.length === 0) {
      ctx.srcBuilder.add("@" + e.attribute.name, e.span);
    } else {
      ctx.srcBuilder.add(
        "@" +
          e.attribute.name +
          "(" +
          params.map(expressionToString).join(", ") +
          ")",
        e.span,
      );
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
  if (declIdent.declElem && isGlobal(declIdent.declElem)) {
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

/** trace through refersTo links in reference Idents until we find the declaration
 * expects that bindIdents has filled in all refersTo: links
 */
export function findDecl(ident: DeclIdent | RefIdent): DeclIdent {
  let i: DeclIdent | RefIdent | undefined = ident;
  do {
    if (i.kind === "decl") {
      return i;
    }
    i = i.refersTo;
  } while (i);

  throw new Error(
    `unresolved ident: ${ident.originalName} (bug in bindIdents?)`,
  );
}

/** check if the element is visible with the current current conditional compilation settings */
export function conditionsValid(
  elem: AbstractElem,
  conditions: Conditions,
): boolean {
  return true;
}
