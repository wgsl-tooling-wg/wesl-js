import type {
  AttributeElem,
  BlockStatement,
  ContinuingElem,
  ElifAttribute,
  ElseAttribute,
  IfAttribute,
  StatementElem,
} from "../AbstractElems.ts";
import { findMap } from "../Util.ts";
import { beginElem, finishElem } from "./ContentsHelpers.ts";
import { parseAttributeList } from "./ParseAttribute.ts";
import { parseIfStatement, parseSwitchStatement } from "./ParseControlFlow.ts";
import { parseConstAssert } from "./ParseGlobalVar.ts";
import { parseLetDecl, parseLocalVarDecl } from "./ParseLocalVar.ts";
import {
  parseContinuingStatement,
  parseForStatement,
  parseLoopStatement,
  parseWhileStatement,
} from "./ParseLoop.ts";
import { parseSimpleStatement } from "./ParseSimpleStatement.ts";
import {
  attachAttributes,
  expect,
  hasConditionalAttribute,
  isConditionalAttribute,
  throwParseError,
} from "./ParseUtil.ts";
import { parseConstDecl } from "./ParseValueDeclaration.ts";
import type { ParsingContext } from "./ParsingContext.ts";

type CondAttr = IfAttribute | ElifAttribute | ElseAttribute;

interface CompoundOptions {
  loopBody?: boolean;
  noScope?: boolean; // for function bodies (scope shared with params)
}

// Experimental: declarations in conditional blocks visible in outer scope.
// e.g. @if(X) { let y = 1; } makes y visible outside the block.
// see https://github.com/wgsl-tooling-wg/wesl-spec/issues/158
const conditionalBlockFeature = true;

/** Function bodies share scope with parameters (per WGSL spec). */
export function parseFunctionBody(ctx: ParsingContext): StatementElem | null {
  return parseCompoundStatement(ctx, undefined, { noScope: true });
}

/**
 * Grammar: '{' statement* '}' (attributes parsed by caller)
 * For loop bodies: '{' statement* continuing_statement? '}'
 */
export function parseCompoundStatement(
  ctx: ParsingContext,
  attributes?: AttributeElem[],
  options?: CompoundOptions,
): StatementElem | null {
  const brace = ctx.stream.matchText("{");
  if (!brace) return null;

  const startPos = getStartWithAttributes(attributes, brace.span[0]);

  beginElem(ctx, "statement", attributes);

  const skipScope =
    options?.noScope ||
    (conditionalBlockFeature && hasConditionalAttr(attributes));
  if (!skipScope) ctx.pushScope();
  parseBlockStatements(ctx, options?.loopBody);
  if (!skipScope) ctx.popScope();

  return finishBlockStatement(startPos, ctx, attributes);
}

/** Grammar: attribute* compound_statement (for control flow bodies) */
export function expectCompound(
  ctx: ParsingContext,
  errorMsg: string,
  loopBody?: boolean,
): StatementElem {
  const attrs = parseAttributeList(ctx);
  const attrsOrUndef = attrs.length > 0 ? attrs : undefined;
  const options = loopBody ? { loopBody } : undefined;
  const block = parseCompoundStatement(ctx, attrsOrUndef, options);
  if (!block) throwParseError(ctx.stream, errorMsg);
  return block;
}

/** Get start position from first attribute, or keyword position. */
export function getStartWithAttributes(
  attributes: AttributeElem[] | undefined,
  keywordPos: number,
): number {
  return attributes?.[0]?.start ?? keywordPos;
}

/** Match keyword and begin statement element. Returns start position or null. */
export function beginStatement(
  ctx: ParsingContext,
  keyword: string,
  attributes?: AttributeElem[],
  kind: "statement" | "continuing" = "statement",
): number | null {
  const keywordPos = ctx.stream.checkpoint();
  if (!ctx.stream.matchText(keyword)) return null;
  const startPos = getStartWithAttributes(attributes, keywordPos);
  beginElem(ctx, kind, attributes);
  return startPos;
}

/** Finish block statement element: close contents, attach attributes. */
export function finishBlockStatement(
  start: number,
  ctx: ParsingContext,
  attributes?: AttributeElem[],
): StatementElem;
export function finishBlockStatement(
  start: number,
  ctx: ParsingContext,
  attributes: AttributeElem[] | undefined,
  kind: "continuing",
): ContinuingElem;
export function finishBlockStatement(
  start: number,
  ctx: ParsingContext,
  attributes?: AttributeElem[],
  kind: "statement" | "continuing" = "statement",
): BlockStatement {
  const elem = finishElem(kind, start, ctx, {});
  attachAttributes(elem, attributes);
  return elem;
}

function hasConditionalAttr(attributes?: AttributeElem[]): boolean {
  return !!attributes && hasConditionalAttribute(attributes);
}

/** Grammar: statement* '}' (after '{' consumed). Loop bodies may end with continuing. */
function parseBlockStatements(ctx: ParsingContext, loopBody?: boolean): void {
  const { stream } = ctx;
  while (true) {
    if (stream.matchText("}")) break;
    const stmt = parseStatement(ctx);
    if (!stmt) throwParseError(stream, "Expected statement or '}'");
    ctx.addElem(stmt);
    if (loopBody && stmt.kind === "continuing") {
      expect(stream, "}", "continuing block");
      break;
    }
  }
}

/**
 * Grammar: statement :
 *   ';' | return_statement ';' | if_statement | switch_statement | loop_statement
 *   | for_statement | while_statement | func_call_statement ';'
 *   | variable_or_value_statement ';' | break_statement ';' | continue_statement ';'
 *   | 'discard' ';' | variable_updating_statement ';' | compound_statement
 *   | const_assert_statement ';'
 */
function parseStatement(ctx: ParsingContext): BlockStatement | null {
  const { stream } = ctx;
  const startPos = stream.checkpoint();
  const attributes = parseAttributeList(ctx);

  const token = stream.peek();
  if (!token || token.text === "}") {
    stream.reset(startPos);
    return null;
  }

  const hasConditional =
    attributes.length > 0 && hasConditionalAttribute(attributes);
  if (hasConditional) ctx.pushScope("partial");

  const attrsOrUndef = attributes.length > 0 ? attributes : undefined;
  const parsers = [
    parseLocalVarDecl,
    parseLetDecl,
    parseConstDecl,
    parseConstAssert,
    parseCompoundStatement,
    parseIfStatement,
    parseSwitchStatement,
    parseForStatement,
    parseWhileStatement,
    parseLoopStatement,
    parseContinuingStatement,
    parseSimpleStatement,
  ];
  const stmt = findMap(parsers, p => p(ctx, attrsOrUndef));
  if (!stmt) return null;

  finalizeConditional(ctx, hasConditional, attributes);
  return stmt as BlockStatement;
}

function finalizeConditional(
  ctx: ParsingContext,
  hasConditional: boolean,
  attributes: AttributeElem[],
): void {
  if (hasConditional) {
    const partialScope = ctx.popScope();
    partialScope.condAttribute = getConditionalAttribute(attributes);
  }
}

function getConditionalAttribute(
  attributes: AttributeElem[],
): CondAttr | undefined {
  const found = attributes.find(a => isConditionalAttribute(a.attribute));
  return found?.attribute as CondAttr | undefined;
}
