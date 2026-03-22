import type {
  AliasElem,
  AttributeElem,
  ConstAssertElem,
  GlobalVarElem,
} from "../AbstractElems.ts";
import { beginElem, finishElem } from "./ContentsHelpers.ts";
import { getStartWithAttributes } from "./ParseStatement.ts";
import { parseSimpleTypeRef } from "./ParseType.ts";
import {
  attachAttributes,
  createDeclIdentElem,
  expect,
  expectExpression,
  expectWord,
  linkDeclIdent,
  linkDeclIdentElem,
  throwParseError,
} from "./ParseUtil.ts";
import { parseTypedDecl } from "./ParseValueDeclaration.ts";
import type { ParsingContext } from "./ParsingContext.ts";

/**
 * Grammar: global_variable_decl : attribute* variable_decl ( '=' expression )?
 * Grammar: variable_decl : 'var' template_list? optionally_typed_ident
 */
export function parseGlobalVarDecl(
  ctx: ParsingContext,
  attributes?: AttributeElem[],
): GlobalVarElem | null {
  const { stream } = ctx;
  const varToken = stream.matchText("var");
  if (!varToken) return null;

  const startPos = getStartWithAttributes(attributes, varToken.span[0]);
  ctx.pushScope("partial");
  beginElem(ctx, "gvar", attributes);

  skipTemplateList(ctx);

  const typedDecl = parseTypedDecl(ctx);
  if (!typedDecl) throwParseError(stream, "Expected identifier after 'var'");
  ctx.addElem(typedDecl);

  if (stream.matchText("=")) {
    expectExpression(ctx);
  }
  expect(stream, ";", "var declaration");

  typedDecl.decl.ident.dependentScope = ctx.currentScope();
  ctx.popScope();

  const varElem = finishElem("gvar", startPos, ctx, { name: typedDecl });
  attachAttributes(varElem, attributes);
  linkDeclIdent(typedDecl, varElem);
  return varElem;
}

/** Grammar: 'alias' ident '=' type_specifier */
export function parseAliasDecl(
  ctx: ParsingContext,
  attributes?: AttributeElem[],
): AliasElem | null {
  const { stream } = ctx;
  const aliasToken = stream.matchText("alias");
  if (!aliasToken) return null;

  const startPos = getStartWithAttributes(attributes, aliasToken.span[0]);
  beginElem(ctx, "alias", attributes);

  const nameToken = expectWord(stream, "Expected identifier after 'alias'");

  const declIdentElem = createDeclIdentElem(ctx, nameToken, true);
  ctx.addElem(declIdentElem);
  ctx.saveIdent(declIdentElem.ident);

  expect(stream, "=", "alias name");
  ctx.pushScope();

  const typeRef = parseSimpleTypeRef(ctx);
  if (!typeRef)
    throwParseError(stream, "Expected type after '=' in alias declaration");
  ctx.addElem(typeRef);

  declIdentElem.ident.dependentScope = ctx.currentScope();
  ctx.popScope();

  expect(stream, ";", "alias declaration");

  const aliasElem = finishElem("alias", startPos, ctx, {
    name: declIdentElem,
    typeRef,
  });
  attachAttributes(aliasElem, attributes);
  linkDeclIdentElem(declIdentElem, aliasElem);
  return aliasElem;
}

/** Grammar: 'const_assert' expression */
export function parseConstAssert(
  ctx: ParsingContext,
  attributes?: AttributeElem[],
): ConstAssertElem | null {
  const assertToken = ctx.stream.matchText("const_assert");
  if (!assertToken) return null;

  const startPos = getStartWithAttributes(attributes, assertToken.span[0]);
  beginElem(ctx, "assert", attributes);
  expectExpression(ctx);
  expect(ctx.stream, ";", "const_assert expression");

  const elem = finishElem("assert", startPos, ctx, {});
  attachAttributes(elem, attributes);
  return elem;
}

/** Skip optional template list (e.g., <storage, read_write>). */
export function skipTemplateList(ctx: ParsingContext): void {
  const { stream } = ctx;
  if (!stream.nextTemplateStartToken()) return;

  while (true) {
    const next = stream.peek();
    if (!next) throwParseError(stream, "Unclosed template in var declaration");
    if (next.text.startsWith(">")) {
      stream.nextTemplateEndToken();
      return;
    }
    stream.nextToken();
  }
}
