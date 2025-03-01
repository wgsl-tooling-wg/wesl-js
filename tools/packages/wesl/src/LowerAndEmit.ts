import { SrcMapBuilder, tracing } from "mini-parse";
import {
  AbstractElem,
  AttributeElem,
  ContainerElem,
  DeclIdentElem,
  DirectiveElem,
  ElemWithAttributes,
  ExpressionElem,
  NameElem,
  RefIdentElem,
  SyntheticElem,
  TextElem
} from "./AbstractElems.ts";
import { assertUnreachable, assertUnreachableSilent } from "./Assertions.ts";
import { isGlobal } from "./BindIdents.ts";
import { elementValid } from "./Conditions.ts";
import { identToString } from "./debug/ScopeToString.ts";
import { Conditions, DeclIdent, Ident } from "./Scope.ts";

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

export function lowerAndEmitElem(e: AbstractElem, ctx: EmitContext): void {
  switch (e.kind) {
    // import statements are dropped from from emitted text
    case "import":
      return;

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
    case "module":
    case "member":
    case "memberRef":
    case "expression":
    case "type":
    case "stuff":
    case "statement":
    case "switch-clause":
      return emitContents(e, ctx);

    // root level container elements get some extra newlines to make the output prettier
    case "fn":
    case "struct":
    case "override":
    case "const":
    case "assert":
    case "alias":
    case "gvar":
      emitRootElemNl(ctx);
      return emitContents(e, ctx);

    case "attribute":
      return emitAttribute(e, ctx);
    case "directive":
      return emitDirective(e, ctx);

    default:
      assertUnreachable(e);
  }
}

/** emit root elems with a blank line inbetween */
function emitRootElemNl(ctx: EmitContext): void {
  if (ctx.extracting) {
    ctx.srcBuilder.addNl();
    ctx.srcBuilder.addNl();
  }
}

export function emitText(e: TextElem, ctx: EmitContext): void {
  ctx.srcBuilder.addCopy(e.start, e.end);
}

export function emitName(e: NameElem, ctx: EmitContext): void {
  ctx.srcBuilder.add(e.name, e.start, e.end);
}

export function emitSynthetic(e: SyntheticElem, ctx: EmitContext): void {
  const { text } = e;
  ctx.srcBuilder.addSynthetic(text, text, 0, text.length);
}

export function emitContents(elem: ContainerElem, ctx: EmitContext): void {
  elem.contents.forEach(e => lowerAndEmitElem(e, ctx));
}

export function emitRefIdent(e: RefIdentElem, ctx: EmitContext): void {
  if (e.ident.std) {
    ctx.srcBuilder.add(e.ident.originalName, e.start, e.end);
  } else {
    const declIdent = findDecl(e.ident);
    const mangledName = displayName(declIdent);
    ctx.srcBuilder.add(mangledName!, e.start, e.end);
  }
}

export function emitDeclIdent(e: DeclIdentElem, ctx: EmitContext): void {
  const mangledName = displayName(e.ident);
  ctx.srcBuilder.add(mangledName!, e.start, e.end);
}

function emitAttribute(e: AttributeElem, ctx: EmitContext): void {
  const { kind } = e.attribute;
  // LATER emit more precise source map info by making use of all the spans
  // Like the first case does
  if (kind === "@attribute") {
    const { params } = e.attribute;
    if (!params || params.length === 0) {
      ctx.srcBuilder.add("@" + e.attribute.name, e.start, e.end);
    } else {
      ctx.srcBuilder.add(
        "@" + e.attribute.name + "(",
        e.start,
        params[0].start,
      );
      for (let i = 0; i < params.length; i++) {
        emitContents(params[i], ctx);
        if (i < params.length - 1) {
          ctx.srcBuilder.add(",", params[i].end, params[i + 1].start);
        }
      }
      ctx.srcBuilder.add(")", params[params.length - 1].end, e.end);
    }
  } else if (kind === "@builtin") {
    ctx.srcBuilder.add(
      "@builtin(" + e.attribute.param.name + ")",
      e.start,
      e.end,
    );
  } else if (kind === "@diagnostic") {
    ctx.srcBuilder.add(
      "@diagnostic" +
        diagnosticControlToString(e.attribute.severity, e.attribute.rule),
      e.start,
      e.end,
    );
  } else if (kind === "@if") {
    ctx.srcBuilder.add(
      `@if(${expressionToString(e.attribute.param.expression)})`,
      e.start,
      e.end,
    );
  } else if (kind === "@interpolate") {
    ctx.srcBuilder.add(
      `@interpolate(${e.attribute.params.map(v => v.name).join(", ")})`,
      e.start,
      e.end,
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
  } else if (kind === "ref") {
    return elem.ident.originalName;
  } else if (kind === "literal") {
    return elem.value;
  } else if (kind === "translate-time-feature") {
    return elem.name;
  } else if (kind === "parenthesized-expression") {
    return `(${expressionToString(elem.expression)})`;
  } else if (kind === "component-expression") {
    return `${expressionToString(elem.base)}[${elem.access}]`;
  } else if (kind === "component-member-expression") {
    return `${expressionToString(elem.base)}.${elem.access}`;
  } else if (kind === "call-expression") {
    return `${elem.function.ident.originalName}(${elem.arguments.map(expressionToString).join(", ")})`;
  } else {
    assertUnreachable(kind);
  }
}

function emitDirective(e: DirectiveElem, ctx: EmitContext): void {
  const { directive } = e;
  const { kind } = directive;
  if (kind === "diagnostic") {
    ctx.srcBuilder.add(
      `diagnostic${diagnosticControlToString(directive.severity, directive.rule)};`,
      e.start,
      e.end,
    );
  } else if (kind === "enable") {
    ctx.srcBuilder.add(
      `enable${directive.extensions.map(v => v.name).join(", ")};`,
      e.start,
      e.end,
    );
  } else if (kind === "requires") {
    ctx.srcBuilder.add(
      `requires${directive.extensions.map(v => v.name).join(", ")};`,
      e.start,
      e.end,
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

/** trace through refersTo links in reference Idents until we find the declaration
 * expects that bindIdents has filled in all refersTo: links
 */
export function findDecl(ident: Ident): DeclIdent {
  let i: Ident | undefined = ident;
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
): true | false | undefined {
  const attrElem = elem as ElemWithAttributes;
  const { kind } = attrElem;

  switch (kind) {
    case "alias":
    case "assert":
    case "const":
    case "directive":
    case "member":
    case "var":
    case "let":
    case "statement":
    case "switch-clause":
    case "override":
    case "gvar":
    case "fn":
    case "struct":
    case "param":
      return elementValid(attrElem, conditions);
    default:
      assertUnreachableSilent(kind);
  }
  return true;
}
