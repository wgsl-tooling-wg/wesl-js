import { SrcMapBuilder } from "mini-parse";
import {
  AbstractElem,
  AttributeElem,
  ContainerElem,
  DeclIdentElem,
  DirectiveElem,
  ElemWithAttributes,
  ExpressionElem,
  FnElem,
  NameElem,
  RefIdentElem,
  StructElem,
  SyntheticElem,
  TextElem,
} from "./AbstractElems.ts";
import {
  assertThatDebug,
  assertUnreachable,
  assertUnreachableSilent,
} from "./Assertions.ts";
import { isGlobal } from "./BindIdents.ts";
import { failIdentElem } from "./ClickableError.ts";
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
  // rootElems.forEach(r => console.log(astToString(r) + "\n"));
  rootElems.forEach(e => lowerAndEmitElem(e, emitContext));
}

export function lowerAndEmitElem(e: AbstractElem, ctx: EmitContext): void {
  if (!conditionsValid(e, ctx.conditions)) return;

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
    case "statement":
    case "stuff":
    case "switch-clause":
      return emitContents(e, ctx);

    // root level container elements get some extra newlines to make the output prettier
    case "override":
    case "const":
    case "assert":
    case "alias":
    case "gvar":
      emitRootElemNl(ctx);
      return emitContents(e, ctx);

    case "fn":
      emitRootElemNl(ctx);
      return emitFn(e, ctx);

    case "struct":
      emitRootElemNl(ctx);
      return emitStruct(e, ctx);

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

/** emit function explicitly so we can control commas between conditional parameters */
export function emitFn(e: FnElem, ctx: EmitContext): void {
  const { attributes, name, params, returnAttributes, returnType, body } = e;
  const { conditions, srcBuilder: builder } = ctx;

  emitAttributes(attributes, ctx);

  builder.add("fn ", name.start - 3, name.start);
  emitDeclIdent(name, ctx);

  builder.appendNext("(");
  const validParams = params.filter(p => conditionsValid(p, conditions));
  validParams.forEach((p, i) => {
    emitContentsNoWs(p, ctx);
    if (i < validParams.length - 1) {
      builder.appendNext(", ");
    }
  });
  builder.appendNext(") ");

  if (returnType) {
    builder.appendNext("-> ");
    emitAttributes(returnAttributes, ctx);
    emitContents(returnType, ctx);
    builder.appendNext(" ");
  }

  emitContents(body, ctx);
}

function emitAttributes(
  attributes: AttributeElem[] | undefined,
  ctx: EmitContext,
): void {
  attributes?.forEach(a => {
    emitAttribute(a, ctx);
    ctx.srcBuilder.add(" ", a.start, a.end);
  });
}

/** emit structs explicitly so we can control commas between conditional members */
export function emitStruct(e: StructElem, ctx: EmitContext): void {
  const { name, members, start, end } = e;
  const { srcBuilder } = ctx;

  const validMembers = members.filter(m => conditionsValid(m, ctx.conditions));
  const validLength = validMembers.length;

  if (validLength === 0) {
    warnEmptyStruct(e);
    return;
  }

  srcBuilder.add("struct ", start, name.start);
  emitDeclIdent(name, ctx);

  if (validLength === 1) {
    srcBuilder.add(" { ", name.end, members[0].start);
    emitContentsNoWs(validMembers[0], ctx);
    srcBuilder.add(" }\n", end - 1, end);
  } else {
    srcBuilder.add(" {\n", name.end, members[0].start);

    validMembers.forEach(m => {
      srcBuilder.add("  ", m.start - 1, m.start);
      emitContentsNoWs(m, ctx);
      srcBuilder.add(",", m.end, m.end + 1);
      srcBuilder.addNl();
    });

    srcBuilder.add("}\n", end - 1, end);
  }
}

function warnEmptyStruct(e: StructElem): void {
  const { name, members } = e;
  const condStr = members.length ? "(with current conditions)" : "";
  const message = `struct '${name.ident.originalName}' has no members ${condStr}`;
  failIdentElem(name, message);
}

export function emitSynthetic(e: SyntheticElem, ctx: EmitContext): void {
  const { text } = e;
  ctx.srcBuilder.addSynthetic(text, text, 0, text.length);
}

export function emitContents(elem: ContainerElem, ctx: EmitContext): void {
  elem.contents.forEach(e => lowerAndEmitElem(e, ctx));
}

/** emit contents w/o white space */
function emitContentsNoWs(elem: ContainerElem, ctx: EmitContext): void {
  elem.contents.forEach(e => {
    if (e.kind === "text") {
      const { srcModule, start, end } = e;
      const text = srcModule.src.slice(start, end);
      if (text.trim() === "") {
        return;
      }
    }
    lowerAndEmitElem(e, ctx);
  });
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
    // (@if is wesl only, dropped from wgsl)
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
      `enable ${directive.extensions.map(v => v.name).join(", ")};`,
      e.start,
      e.end,
    );
  } else if (kind === "requires") {
    ctx.srcBuilder.add(
      `requires ${directive.extensions.map(v => v.name).join(", ")};`,
      e.start,
      e.end,
    );
  } else {
    assertUnreachable(kind);
  }
}

function displayName(declIdent: DeclIdent): string {
  if (isGlobal(declIdent)) {
    assertThatDebug(
      declIdent.mangledName,
      `ERR: mangled name not found for decl ident ${identToString(declIdent)}`,
    );
    // mangled name was set in binding step
    return declIdent.mangledName!;
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

  // TODO show source position if this can happen in a non buggy linker.
  throw new Error(`unresolved identifer: ${ident.originalName}`);
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
