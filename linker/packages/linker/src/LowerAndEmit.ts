import { SrcMapBuilder, tracing } from "mini-parse";
import {
  AbstractElem,
  DeclIdentElem,
  LiteralElem,
  NameElem,
  RefIdentElem,
  SyntheticElem,
  TextElem,
} from "./AbstractElems.ts";
import { isGlobal } from "./BindIdents.ts";
import { identToString } from "./debug/ScopeToString.ts";
import { Conditions, DeclIdent, Ident } from "./Scope.ts";
import { assertUnreachable } from "./Assertions.ts";

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
    case "literal":
      return emitLiteral(e, ctx);
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
    case "attribute":
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
      if (ctx.extracting) {
        ctx.srcBuilder.addNl();
        ctx.srcBuilder.addNl();
      }
      return emitContents(e, ctx);

    default:
      assertUnreachable(e);
  }
}

export function emitText(e: TextElem, ctx: EmitContext): void {
  ctx.srcBuilder.addCopy(e.srcModule.src, e.start, e.end);
}
export function emitLiteral(e: LiteralElem, ctx: EmitContext): void {
  ctx.srcBuilder.addCopy(e.srcModule.src, e.start, e.end);
}

export function emitName(e: NameElem, ctx: EmitContext): void {
  ctx.srcBuilder.add(e.name, e.srcModule.src, e.start, e.end);
}

export function emitSynthetic(e: SyntheticElem, ctx: EmitContext): void {
  const { text } = e;
  ctx.srcBuilder.add(text, text, 0, text.length);
}

export function emitContents(
  elem: AbstractElem & { contents: AbstractElem[] },
  ctx: EmitContext,
): void {
  elem.contents.forEach(e => lowerAndEmitElem(e, ctx));
}

export function emitRefIdent(e: RefIdentElem, ctx: EmitContext): void {
  if (e.ident.std) {
    ctx.srcBuilder.add(e.ident.originalName, e.srcModule.src, e.start, e.end);
  } else {
    const declIdent = findDecl(e.ident);
    const mangledName = displayName(declIdent);
    ctx.srcBuilder.add(mangledName!, e.srcModule.src, e.start, e.end);
  }
}

export function emitDeclIdent(e: DeclIdentElem, ctx: EmitContext): void {
  const mangledName = displayName(e.ident);
  ctx.srcBuilder.add(mangledName!, e.srcModule.src, e.start, e.end);
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
