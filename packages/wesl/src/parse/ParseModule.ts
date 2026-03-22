import type {
  Attribute,
  AttributeElem,
  ConditionalAttribute,
  ConstAssertElem,
  GlobalDeclarationElem,
} from "../AbstractElems.ts";
import { findMap } from "../Util.ts";
import { parseAttributeList } from "./ParseAttribute.ts";
import { parseDirective } from "./ParseDirective.ts";
import { parseFnDecl } from "./ParseFn.ts";
import {
  parseAliasDecl,
  parseConstAssert,
  parseGlobalVarDecl,
} from "./ParseGlobalVar.ts";
import { parseWeslImports } from "./ParseImport.ts";
import { parseStructDecl } from "./ParseStruct.ts";
import {
  hasConditionalAttribute,
  parseMany,
  throwParseError,
} from "./ParseUtil.ts";
import { parseConstDecl, parseOverrideDecl } from "./ParseValueDeclaration.ts";
import type { ParsingContext } from "./ParsingContext.ts";

const declParsers = [
  parseConstDecl,
  parseOverrideDecl,
  parseGlobalVarDecl,
  parseAliasDecl,
  parseStructDecl,
  parseFnDecl,
  parseConstAssert,
];

/** Grammar: translation_unit : global_directive* ( global_decl | global_assert | ';' )* */
export function parseModule(ctx: ParsingContext): void {
  parseImports(ctx);
  parseDirectives(ctx);
  while (parseNextDeclaration(ctx)) {}
}

/** Parse WESL import statements at the start of the module. */
function parseImports(ctx: ParsingContext): void {
  const importElems = parseWeslImports(ctx);
  for (const importElem of importElems) {
    ctx.addElem(importElem);
    ctx.state.stable.imports.push(importElem.imports);
  }
}

/** Grammar: global_directive : diagnostic_directive | enable_directive | requires_directive */
function parseDirectives(ctx: ParsingContext): void {
  const directives = parseMany(ctx, parseDirective);
  for (const elem of directives) ctx.addElem(elem);
}

/** Parse one declaration, return true if more may exist. */
function parseNextDeclaration(ctx: ParsingContext): boolean {
  const { stream } = ctx;
  if (stream.matchText(";")) return true;

  const attrs = parseAttributeList(ctx);
  const hasConditional = hasConditionalAttribute(attrs);
  if (hasConditional) ctx.pushScope("partial");

  const parsed = parseDecl(ctx, attrs);
  if (hasConditional && parsed) finalizeConditional(ctx, attrs);

  if (parsed) return true;
  if (attrs.length)
    throwParseError(stream, "Expected declaration after attributes");
  return false;
}

/** Try each declaration parser until one succeeds. */
function parseDecl(ctx: ParsingContext, attrs: AttributeElem[]): boolean {
  const attrsOrUndef = attrs.length ? attrs : undefined;
  const elem = findMap(declParsers, p => p(ctx, attrsOrUndef));
  if (elem) {
    recordDecl(ctx, elem, attrs);
    return true;
  }
  return false;
}

/** Pop conditional scope and attach the conditional attribute. */
function finalizeConditional(
  ctx: ParsingContext,
  attrs: AttributeElem[],
): void {
  const partialScope = ctx.popScope();
  partialScope.condAttribute = findMap(attrs, ({ attribute }) =>
    isConditionalAttribute(attribute) ? attribute : undefined,
  );
}

/** Record a parsed declaration, extending start to include attributes. */
function recordDecl(
  ctx: ParsingContext,
  elem: GlobalDeclarationElem | ConstAssertElem,
  attrs: AttributeElem[],
): void {
  if (attrs.length && elem.start > attrs[0].start) elem.start = attrs[0].start;
  ctx.addElem(elem);
  if (elem.kind === "assert") {
    const { stable } = ctx.state;
    stable.moduleAsserts ??= [];
    stable.moduleAsserts.push(elem);
  }
}

function isConditionalAttribute(a: Attribute): a is ConditionalAttribute {
  return a.kind === "@if" || a.kind === "@elif" || a.kind === "@else";
}
