import {
  Span,
  spannedText,
  SpannedText,
  SyntheticText,
  syntheticText,
  tracing,
} from "mini-parse";
import {
  AbstractElem,
  AttributeElem,
  ContainerElem,
  DeclIdentElem,
  DirectiveElem,
  ExpressionElem,
  NameElem,
  RefIdentElem,
  SyntheticElem,
  TextElem,
  UnknownExpressionElem,
} from "./AbstractElems.ts";
import { assertUnreachable } from "./Assertions.ts";
import { isGlobal } from "./BindIdents.ts";
import { identToString } from "./debug/ScopeToString.ts";
import { Conditions, DeclIdent, Ident } from "./Scope.ts";

/** passed to the emitters */
interface EmitContext {
  conditions: Conditions; // settings for conditional compilation
  extracting: boolean; // are we extracting or copying the root module
}

/** traverse the AST, starting from root elements, emitting wgsl for each */
export function lowerAndEmit(
  rootElems: AbstractElem[],
  span: Span,
  conditions: Conditions,
  extracting = true,
): SpannedText {
  const emitContext: EmitContext = { conditions, extracting };
  return lowerAndEmitRecursive(rootElems, span, emitContext);
}

function lowerAndEmitRecursive(
  elems: AbstractElem[],
  span: Span,
  emitContext: EmitContext,
): SpannedText {
  const validElems = elems.filter(e =>
    conditionsValid(e, emitContext.conditions),
  );
  const children = validElems
    .map(e => lowerAndEmitElem(e, emitContext))
    .filter(v => v !== null);
  return spannedText(span, ...children);
}

export function lowerAndEmitElem(
  e: AbstractElem,
  ctx: EmitContext,
): SpannedText | SyntheticText | null {
  switch (e.kind) {
    // import statements are dropped from from emitted text
    case "import":
      return null;

    // terminal elements copy strings to the output
    case "text":
      return emitText(e);
    case "name":
      return emitName(e);
    case "synthetic":
      return emitSynthetic(e);

    // identifiers are copied to the output, but with potentially mangled names
    case "ref":
      return emitRefIdent(e);
    case "decl":
      return emitDeclIdent(e);

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
      return emitContents(e, ctx);

    // root level container elements get some extra newlines to make the output prettier
    case "fn":
    case "struct":
    case "override":
    case "const":
    case "assert":
    case "alias":
    case "gvar":
      let contents = emitContents(e, ctx);
      if (ctx.extracting) {
        contents = spannedText(
          contents.srcSpan,
          syntheticText("\n\n"),
          contents,
        );
      }
      return contents;

    case "attribute":
      return emitAttribute(e, ctx);
    case "directive":
      return emitDirective(e, ctx);

    default:
      assertUnreachable(e);
  }
}

export function emitText(e: TextElem): SpannedText {
  return spannedText([e.start, e.end], e.srcModule.src.slice(e.start, e.end));
}

export function emitName(e: NameElem): SpannedText {
  return spannedText([e.start, e.end], e.name);
}

export function emitSynthetic(e: SyntheticElem): SyntheticText {
  return syntheticText(e.text);
}

export function emitContents(
  elem: ContainerElem,
  ctx: EmitContext,
): SpannedText {
  return spannedText(
    [elem.start, elem.end],
    ...elem.contents.map(e => lowerAndEmitElem(e, ctx)).filter(v => v !== null),
  );
}

export function emitRefIdent(e: RefIdentElem): SpannedText {
  if (e.ident.std) {
    return spannedText([e.start, e.end], e.ident.originalName);
  } else {
    const declIdent = findDecl(e.ident);
    const mangledName = displayName(declIdent);
    return spannedText([e.start, e.end], mangledName);
  }
}

export function emitDeclIdent(e: DeclIdentElem): SpannedText {
  const mangledName = displayName(e.ident);
  return spannedText([e.start, e.end], mangledName);
}

function emitAttribute(e: AttributeElem, ctx: EmitContext): SpannedText {
  const { kind } = e.attribute;
  let span: Span = [e.start, e.end];
  if (kind === "attribute") {
    const { params } = e.attribute;
    if (params.length === 0) {
      return spannedText(span, "@", e.attribute.name);
    } else {
      return spannedText(
        span,
        "@",
        e.attribute.name,
        "(",
        ...emitParams(params, ctx),
        ")",
      );
    }
  } else if (kind === "@builtin") {
    return spannedText(span, "@builtin(", emitName(e.attribute.param), ")");
  } else if (kind === "@diagnostic") {
    return spannedText(
      span,
      "@diagnostic",
      diagnosticControlToString(e.attribute.severity, e.attribute.rule),
    );
  } else if (kind === "@if") {
    return spannedText(
      span,
      `@if(${expressionToString(e.attribute.param.expression)})`,
    );
  } else if (kind === "@interpolate") {
    return spannedText(
      span,
      "@interpolate(",
      ...emitNames(e.attribute.params),
      ")",
    );
  } else {
    assertUnreachable(kind);
  }
}

function emitParams(
  params: ContainerElem[],
  ctx: EmitContext,
): (string | SpannedText)[] {
  let result: (SpannedText | string)[] = [emitContents(params[0], ctx)];
  for (let i = 1; i < params.length; i++) {
    result.push(",");
    result.push(emitContents(params[i], ctx));
  }
  return result;
}

function emitNames(names: NameElem[]): (string | SpannedText)[] {
  let result: (SpannedText | string)[] = [emitName(names[0])];
  for (let i = 1; i < names.length; i++) {
    result.push(", ");
    result.push(emitName(names[i]));
  }
  return result;
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

function emitDirective(e: DirectiveElem, ctx: EmitContext): SpannedText {
  const { directive } = e;
  let span: Span = [e.start, e.end];
  const { kind } = directive;
  if (kind === "diagnostic") {
    return spannedText(
      span,
      "diagnostic",
      diagnosticControlToString(directive.severity, directive.rule),
    );
  } else if (kind === "enable") {
    return spannedText(span, "enable ", ...emitNames(directive.extensions));
  } else if (kind === "requires") {
    return spannedText(span, "requires ", ...emitNames(directive.extensions));
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
): boolean {
  return true;
}
