import type { AttributeElem, StatementElem } from "../../AbstractElems.ts";
import { beginElem, finishElem } from "./ContentsHelpers.ts";
import { parseAttributeList } from "./ParseAttribute.ts";
import {
  beginStatement,
  expectCompound,
  finishBlockStatement,
  parseCompoundStatement,
} from "./ParseStatement.ts";
import {
  attachAttributes,
  expect,
  expectExpression,
  throwParseError,
} from "./ParseUtil.ts";
import type { ParsingContext } from "./ParsingContext.ts";

/**
 * Grammar: if_statement : attribute* if_clause else_if_clause* else_clause?
 * Grammar: if_clause : 'if' expression compound_statement
 */
export function parseIfStatement(
  ctx: ParsingContext,
  attributes?: AttributeElem[],
): StatementElem | null {
  const startPos = beginStatement(ctx, "if", attributes);
  if (startPos === null) return null;

  expectExpression(ctx, "Expected condition expression after 'if'");

  const body = expectCompound(ctx, "Expected '{' after if condition");
  ctx.addElem(body);
  parseElseChain(ctx);

  return finishBlockStatement(startPos, ctx, attributes);
}

/** Grammar: switch_statement : attribute* 'switch' expression switch_body */
export function parseSwitchStatement(
  ctx: ParsingContext,
  attributes?: AttributeElem[],
): StatementElem | null {
  const startPos = beginStatement(ctx, "switch", attributes);
  if (startPos === null) return null;

  expectExpression(ctx, "Expected expression after 'switch'");
  expectSwitchClauses(ctx);

  return finishBlockStatement(startPos, ctx, attributes);
}

/**
 * Grammar: else_if_clause : 'else' 'if' expression compound_statement
 * Grammar: else_clause : 'else' compound_statement
 */
function parseElseChain(ctx: ParsingContext): void {
  const { stream } = ctx;
  while (stream.matchText("else")) {
    const elseIf = stream.matchText("if");
    if (elseIf) {
      expectExpression(ctx, "Expected expression after 'else if'");
      const body = expectCompound(ctx, "Expected '{' after else if");
      ctx.addElem(body);
      continue;
    }

    const body = expectCompound(ctx, "Expected '{' after else");
    ctx.addElem(body);
    break;
  }
}

/**
 * Grammar: switch_body : attribute* '{' switch_clause+ '}'
 * Grammar: switch_clause : case_clause | default_alone_clause
 * Grammar: case_clause : 'case' case_selectors ':'? compound_statement
 * Grammar: default_alone_clause : 'default' ':'? compound_statement
 */
function expectSwitchClauses(ctx: ParsingContext): void {
  const { stream } = ctx;
  parseAttributeList(ctx);
  expect(stream, "{", "switch expression");
  while (!stream.matchText("}")) {
    const clauseStart = stream.checkpoint();
    const clauseAttrs = parseAttributeList(ctx);
    beginElem(
      ctx,
      "switch-clause",
      clauseAttrs.length ? clauseAttrs : undefined,
    );

    if (stream.matchText("case")) {
      parseCaseSelectors(ctx);
      parseCaseBody(ctx, "Expected '{' after case value");
    } else if (stream.matchText("default")) {
      parseCaseBody(ctx, "Expected '{' after 'default'");
    } else {
      throwParseError(stream, "Expected 'case', 'default', or '}' in switch");
    }

    const clauseElem = finishElem("switch-clause", clauseStart, ctx, {});
    attachAttributes(clauseElem, clauseAttrs.length ? clauseAttrs : undefined);
    ctx.addElem(clauseElem);
  }
}

/** Grammar: case_selectors : case_selector (',' case_selector)* ','? */
function parseCaseSelectors(ctx: ParsingContext): void {
  const { stream } = ctx;
  expectExpression(ctx, "Expected expression after 'case'");
  while (stream.matchText(",")) {
    expectExpression(ctx, "Expected expression after ',' in case values");
  }
}

/**
 * Grammar: case_clause : 'case' case_selectors ':'? compound_statement
 * Grammar: default_alone_clause : 'default' ':'? compound_statement
 */
function parseCaseBody(ctx: ParsingContext, errorMsg: string): void {
  ctx.stream.matchText(":");

  const bodyAttrs = parseAttributeList(ctx);
  const attrs = bodyAttrs.length > 0 ? bodyAttrs : undefined;

  const body = parseCompoundStatement(ctx, attrs);
  if (!body) throwParseError(ctx.stream, errorMsg);
  ctx.addElem(body);
}
