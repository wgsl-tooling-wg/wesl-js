import type {
  Attribute,
  AttributeElem,
  BuiltinAttribute,
  DiagnosticAttribute,
  DiagnosticRule,
  ElifAttribute,
  ElseAttribute,
  ExpressionElem,
  IfAttribute,
  InterpolateAttribute,
  NameElem,
  StandardAttribute,
  TestAttribute,
  TranslateTimeExpressionElem,
  UnknownExpressionElem,
} from "../AbstractElems.ts";
import { ParseError } from "../ParseError.ts";
import { beginElem, finishContents } from "./ContentsHelpers.ts";
import { parseExpression } from "./ParseExpression.ts";
import {
  expect,
  expectWord,
  makeNameElem,
  parseCommaList,
  parseMany,
} from "./ParseUtil.ts";
import type { ParsingContext } from "./ParsingContext.ts";

/** Grammar: attribute * */
export function parseAttributeList(ctx: ParsingContext): AttributeElem[] {
  return [...parseMany(ctx, parseAttribute)];
}

/** WESL Grammar: if_attribute : '@if' '(' translate_time_expression ')' */
export function parseIfAttribute(ctx: ParsingContext): IfAttribute | null {
  return parseConditionalAttribute(ctx, "if", makeIfAttribute);
}

/** WESL Grammar: else_attribute : '@else' */
export function parseElseAttribute(ctx: ParsingContext): ElseAttribute | null {
  if (!ctx.stream.matchSequence("@", "else")) return null;
  return makeElseAttribute();
}

/** WESL Grammar: elif_attribute : '@elif' '(' translate_time_expression ')' */
export function parseElifAttribute(ctx: ParsingContext): ElifAttribute | null {
  return parseConditionalAttribute(ctx, "elif", makeElifAttribute);
}

/**
 * Grammar: attribute :
 *   '@' ident_pattern_token argument_expression_list ?
 *   | align_attr | binding_attr | blend_src_attr | builtin_attr | const_attr
 *   | diagnostic_attr | group_attr | id_attr | interpolate_attr | invariant_attr
 *   | location_attr | must_use_attr | size_attr | workgroup_size_attr
 *   | vertex_attr | fragment_attr | compute_attr
 * WESL extensions: @if, @elif, @else
 */
function parseAttribute(ctx: ParsingContext): AttributeElem | null {
  const { stream } = ctx;
  const startPos = stream.checkpoint();
  if (!stream.matchText("@")) return null;
  stream.reset(startPos);

  const weslAttr = parseWeslConditional(ctx);
  if (weslAttr) return weslAttr;

  const stdAttr = parseStandardAttribute(ctx);
  if (stdAttr) return stdAttr;

  return null;
}

/** Parse `@if(expr)` or `@elif(expr)` conditional attributes. */
function parseConditionalAttribute<T>(
  ctx: ParsingContext,
  keyword: string,
  makeAttr: (expr: TranslateTimeExpressionElem) => T,
): T | null {
  const { stream } = ctx;
  const startPos = stream.checkpoint();
  if (!stream.matchSequence("@", keyword)) return null;

  expect(stream, "(", `@${keyword}`);
  const expr = parseExpression(ctx, true);
  if (!expr) return null;

  stream.matchText(",");
  expect(stream, ")", `@${keyword} expression`);

  const translateTimeExpr = makeTranslateTimeExpressionElem({
    value: expr,
    span: [startPos, stream.checkpoint()],
  });
  return makeAttr(translateTimeExpr);
}

function makeIfAttribute(param: TranslateTimeExpressionElem): IfAttribute {
  return { kind: "@if", param } as const;
}

function makeElseAttribute(): ElseAttribute {
  return { kind: "@else" } as const;
}

function makeElifAttribute(param: TranslateTimeExpressionElem): ElifAttribute {
  return { kind: "@elif", param } as const;
}

/** Parse WESL conditional attributes (@if, @elif, @else) */
export function parseWeslConditional(
  ctx: ParsingContext,
): AttributeElem | null {
  const { stream } = ctx;
  const peeked = stream.peek();
  if (peeked?.text !== "@") return null;
  const startPos = peeked.span[0]; // Use token position, not stream checkpoint

  const ifAttr = parseIfAttribute(ctx);
  if (ifAttr) return attributeElem(ifAttr, startPos, stream.checkpoint());

  const elifAttr = parseElifAttribute(ctx);
  if (elifAttr) return attributeElem(elifAttr, startPos, stream.checkpoint());

  const elseAttr = parseElseAttribute(ctx);
  if (elseAttr) return attributeElem(elseAttr, startPos, stream.checkpoint());

  return null;
}

/** Parse a standard attribute (not @if/@elif/@else) */
function parseStandardAttribute(ctx: ParsingContext): AttributeElem | null {
  const { stream } = ctx;
  const resetPos = stream.checkpoint();
  const atToken = stream.matchText("@");
  if (!atToken) return null;
  const startPos = atToken.span[0]; // Use actual @ position, not before whitespace

  const nameToken = stream.peek();
  if (
    !nameToken ||
    (nameToken.kind !== "word" && nameToken.kind !== "keyword")
  ) {
    stream.reset(resetPos);
    return null;
  }

  stream.nextToken();
  const name = nameToken.text;

  if (name === "builtin") return parseBuiltinAttribute(ctx, startPos);
  if (name === "interpolate") return parseInterpolateAttribute(ctx, startPos);
  if (name === "diagnostic") return parseDiagnosticAttribute(ctx, startPos);
  if (name === "test") return parseTestAttribute(ctx, startPos);

  let params: UnknownExpressionElem[] | undefined;
  if (stream.matchText("(")) {
    params = parseAttributeParams(ctx);
    expect(stream, ")", "attribute parameters");
  }

  if (name === "must_use" && params !== undefined) {
    throw new ParseError("@must_use does not accept parameters", [
      startPos,
      stream.checkpoint(),
    ]);
  }

  const stdAttr: StandardAttribute = { kind: "@attribute", name, params };
  return attributeElem(stdAttr, startPos, stream.checkpoint());
}

// TODO remove translate-time once we drop v1
function makeTranslateTimeExpressionElem(args: {
  value: ExpressionElem;
  span: [number, number];
}): TranslateTimeExpressionElem {
  return {
    kind: "translate-time-expression",
    expression: args.value,
    span: args.span,
  };
}

function attributeElem(
  attribute: Attribute,
  start: number,
  end: number,
): AttributeElem {
  return { kind: "attribute", attribute, start, end, contents: [] };
}

function parseBuiltinAttribute(
  ctx: ParsingContext,
  startPos: number,
): AttributeElem {
  const { stream } = ctx;
  expect(stream, "(", "@builtin");
  const nameToken = expectWord(stream, "Expected identifier in @builtin");
  expect(stream, ")", "@builtin parameter");

  const builtinAttr: BuiltinAttribute = {
    kind: "@builtin",
    param: makeNameElem(nameToken),
  };

  return attributeElem(builtinAttr, startPos, stream.checkpoint());
}

/** Parse @test or @test(description) attribute. */
function parseTestAttribute(
  ctx: ParsingContext,
  startPos: number,
): AttributeElem {
  const { stream } = ctx;
  let description: NameElem | undefined;

  if (stream.matchText("(")) {
    const nameToken = expectWord(stream, "Expected identifier in @test");
    description = makeNameElem(nameToken);
    expect(stream, ")", "@test parameter");
  }

  const testAttr: TestAttribute = { kind: "@test", description };
  return attributeElem(testAttr, startPos, stream.checkpoint());
}

function parseInterpolateAttribute(
  ctx: ParsingContext,
  startPos: number,
): AttributeElem {
  const { stream } = ctx;
  expect(stream, "(", "@interpolate");
  const params = parseCommaList(ctx, parseNameElem);
  expect(stream, ")", "@interpolate parameters");

  const interpolateAttr: InterpolateAttribute = {
    kind: "@interpolate",
    params,
  };
  return attributeElem(interpolateAttr, startPos, stream.checkpoint());
}

function parseNameElem(ctx: ParsingContext): NameElem {
  const nameToken = expectWord(ctx.stream, "Expected identifier");
  return makeNameElem(nameToken);
}

/** @diagnostic(severity, rule) or @diagnostic(severity, namespace.rule) */
function parseDiagnosticAttribute(
  ctx: ParsingContext,
  startPos: number,
): AttributeElem {
  const { stream } = ctx;

  expect(stream, "(", "@diagnostic");
  const severityToken = expectWord(stream, "Expected severity in @diagnostic");
  const severity = makeNameElem(severityToken);

  expect(stream, ",", "@diagnostic severity");
  const firstToken = expectWord(stream, "Expected rule in @diagnostic");
  const firstName = makeNameElem(firstToken);

  let rule: DiagnosticRule;
  if (stream.matchText(".")) {
    const secondToken = expectWord(stream, "Expected rule after namespace");
    rule = [firstName, makeNameElem(secondToken)];
  } else {
    rule = [firstName, null];
  }
  expect(stream, ")", "@diagnostic parameters");

  const kind = "@diagnostic";
  const diagnosticAttr: DiagnosticAttribute = { kind, severity, rule };
  return attributeElem(diagnosticAttr, startPos, stream.checkpoint());
}

/** Parse attribute params as expressions to capture identifier refs. */
function parseAttributeParams(ctx: ParsingContext): UnknownExpressionElem[] {
  return parseCommaList(ctx, parseAttrParam);
}

function parseAttrParam(ctx: ParsingContext): UnknownExpressionElem {
  const { stream } = ctx;
  const start = stream.checkpoint();
  beginElem(ctx, "expression");
  parseExpression(ctx);
  const end = stream.checkpoint();
  const contents = finishContents(ctx, start, end);
  return { kind: "expression", start, end, contents };
}
