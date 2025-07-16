import {
  delimited,
  fn,
  opt,
  or,
  type Parser,
  preceded,
  repeatPlus,
  req,
  type Span,
  type Stream,
  seq,
  span,
  tagScope,
  token,
  tokenKind,
  tokenOf,
  yes,
} from "mini-parse";
import type {
  BinaryExpression,
  BinaryOperator,
  ElifAttribute,
  ElseAttribute,
  ExpressionElem,
  IfAttribute,
  Literal,
  ParenthesizedExpression,
  TranslateTimeExpressionElem,
  TranslateTimeFeature,
  UnaryExpression,
  UnaryOperator,
} from "../AbstractElems.ts";
import { specialAttribute } from "../WESLCollect.ts";
import type { WeslToken } from "./WeslStream.ts";
import { weslExtension } from "./WeslStream.ts";

// Expression parsers for @if conditions - supports literals (true/false),
// parenthesized expressions, translate-time features, and binary operators (&&, ||)
const attribute_if_primary_expression: Parser<
  Stream<WeslToken>,
  Literal | ParenthesizedExpression | TranslateTimeFeature
> = or(
  tokenOf("keyword", ["true", "false"]).map(makeLiteral),
  delimited(
    token("symbol", "("),
    fn(() => attribute_if_expression),
    token("symbol", ")"),
  ).map(makeParenthesizedExpression),
  tokenKind("word").map(makeTranslateTimeFeature),
);

const attribute_if_unary_expression: Parser<
  Stream<WeslToken>,
  ExpressionElem
> = or(
  seq(
    token("symbol", "!").map(makeUnaryOperator),
    fn(() => attribute_if_unary_expression),
  ).map(makeUnaryExpression),
  attribute_if_primary_expression,
);

const attribute_if_expression: Parser<
  Stream<WeslToken>,
  ExpressionElem
> = weslExtension(
  seq(
    attribute_if_unary_expression,
    or(
      repeatPlus(
        seq(
          token("symbol", "||").map(makeBinaryOperator),
          req(
            attribute_if_unary_expression,
            "invalid expression, expected expression",
          ),
        ),
      ),
      repeatPlus(
        seq(
          token("symbol", "&&").map(makeBinaryOperator),
          req(
            attribute_if_unary_expression,
            "invalid expression, expected expression",
          ),
        ),
      ),
      yes().map(() => []),
    ),
  ).map(makeRepeatingBinaryExpression),
);

/** Base parser for @if attributes without collection - use in seq() compositions */
// prettier-ignore
export const if_attribute_base = preceded(
  seq("@", weslExtension("if")),
  span(
    delimited(
      "(",
      fn(() => attribute_if_expression),
      seq(opt(","), ")"),
    ),
  ).map(makeTranslateTimeExpressionElem),
)
  .map(makeIfAttribute)
  .ptag("attr_variant");

/** Base parser for @elif attributes without collection - use in seq() compositions */
// prettier-ignore
export const elif_attribute_base = preceded(
  seq("@", weslExtension("elif")),
  span(
    delimited(
      "(",
      fn(() => attribute_if_expression),
      seq(opt(","), ")"),
    ),
  ).map(makeTranslateTimeExpressionElem),
)
  .map(makeElifAttribute)
  .ptag("attr_variant");

/** Base parser for @else attributes without collection - use in seq() compositions */
// prettier-ignore
export const else_attribute_base = preceded(
  seq("@", weslExtension("else")),
  yes,
)
  .map(makeElseAttribute)
  .ptag("attr_variant");

/** Collected parser for @if attributes - use standalone, not in seq() */
// prettier-ignore
export const if_attribute = tagScope(
  if_attribute_base.collect(specialAttribute),
);

/** Collected parser for @elif attributes - use standalone, not in seq() */
// prettier-ignore
export const elif_attribute = tagScope(
  elif_attribute_base.collect(specialAttribute),
);

/** Collected parser for @else attributes - use standalone, not in seq() */
// prettier-ignore
export const else_attribute = tagScope(
  else_attribute_base.collect(specialAttribute),
);

// Helper functions
function makeIfAttribute(param: TranslateTimeExpressionElem): IfAttribute {
  return { kind: "@if", param };
}

function makeElifAttribute(param: TranslateTimeExpressionElem): ElifAttribute {
  return { kind: "@elif", param };
}

function makeElseAttribute(): ElseAttribute {
  return { kind: "@else" };
}

function makeTranslateTimeExpressionElem(args: {
  value: ExpressionElem;
  span: Span;
}): TranslateTimeExpressionElem {
  return {
    kind: "translate-time-expression",
    expression: args.value,
    span: args.span,
  };
}

function makeLiteral(token: WeslToken<"keyword" | "number">): Literal {
  return {
    kind: "literal",
    value: token.text,
    span: token.span,
  };
}

function makeTranslateTimeFeature(
  token: WeslToken<"word">,
): TranslateTimeFeature {
  return {
    kind: "translate-time-feature",
    name: token.text,
    span: token.span,
  };
}

function makeParenthesizedExpression(
  expression: ExpressionElem,
): ParenthesizedExpression {
  return {
    kind: "parenthesized-expression",
    expression,
  };
}

function makeUnaryOperator(token: WeslToken<"symbol">): UnaryOperator {
  return { value: token.text as any, span: token.span };
}

function makeBinaryOperator(token: WeslToken<"symbol">): BinaryOperator {
  return { value: token.text as any, span: token.span };
}

function makeUnaryExpression([operator, expression]: [
  UnaryOperator,
  ExpressionElem,
]): UnaryExpression {
  return { kind: "unary-expression", operator, expression };
}

function makeRepeatingBinaryExpression([start, repeating]: [
  ExpressionElem,
  [BinaryOperator, ExpressionElem][],
]): ExpressionElem {
  let result: ExpressionElem = start;
  for (const [op, left] of repeating) {
    const binaryExpression: BinaryExpression = {
      kind: "binary-expression",
      operator: op,
      left: result,
      right: left,
    };
    result = binaryExpression;
  }
  return result;
}
