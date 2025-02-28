import {
  delimited,
  fn,
  opt,
  or,
  preceded,
  repeat,
  repeatPlus,
  req,
  seq,
  span,
  Span,
  token,
  tokenKind,
  tokenOf,
  tracing,
  withSep,
  withSepPlus,
  yes,
} from "mini-parse";
import { full_ident, name, WeslParser, PT } from "./BaseGrammar.ts";
import {
  templateClose,
  templateOpen,
  weslExtension,
  WeslToken,
} from "./WeslStream.ts";
import {
  BinaryExpression,
  BinaryOperator,
  ExpressionElem,
  FunctionCallExpression,
  Literal,
  ParenthesizedExpression,
  TemplatedIdentElem,
  UnaryExpression,
  UnaryOperator,
} from "./ExpressionElem.ts";
import {
  FullIdent,
  LhsExpression,
  LhsIdentElem,
  LhsParenthesizedExpression,
  LhsUnaryExpression,
  LhsUnaryOperator,
  NameElem,
} from "./WeslElems.ts";

const literal = or(
  tokenOf("keyword", ["true", "false"]),
  tokenKind("number"),
).map(makeLiteral);

const paren_expression = delimited(
  "(",
  req(fn(() => expression)),
  req(")"),
).map(makeParenthesizedExpression);

const primary_expression: WeslParser<ExpressionElem<PT>> = or(
  literal,
  paren_expression,
  seq(
    fn(() => templated_ident),
    opt(fn(() => argument_expression_list)),
  ).map(tryMakeFunctionCall),
);
export const component_or_swizzle: WeslParser<
  (NameElem | ExpressionElem<PT>)[]
> = repeatPlus(
  or(
    preceded(".", name),
    delimited("[", () => expression, req("]")),
  ),
);
const unary_expression: WeslParser<ExpressionElem<PT>> = or(
  seq(unaryOperator(["!", "&", "*", "-", "~"]), () => unary_expression).map(
    makeUnaryExpression,
  ),
  seq(primary_expression, opt(component_or_swizzle)).map(
    tryMakeComponentOrSwizzle,
  ),
);
const bitwise_post_unary: WeslParser<PartialBinaryExpression[]> = or(
  // TODO: I can skip template list discovery in these cases, because a&b<c cannot be a comparison. Must be a template
  repeatPlus(seq(binaryOperator("&"), unary_expression)),
  repeatPlus(seq(binaryOperator("^"), unary_expression)),
  repeatPlus(seq(binaryOperator("|"), unary_expression)),
);
const multiplicative_operator = binaryOperator(["%", "*", "/"]);
// TODO: "// this handles the special case `x = 5--7` which must be parsed as `x = 5 - (-7)`" is in mathis implementation
const additive_operator = binaryOperator(["+", "-"]);
const shift_post_unary = (
  inTemplate: boolean,
): WeslParser<PartialBinaryExpression[]> => {
  const shift_left = seq(binaryOperator("<<"), unary_expression).map(v => [v]);
  const shift_right = seq(binaryOperator(">>"), unary_expression).map(v => [v]);
  const mul_add: WeslParser<PartialBinaryExpression[]> = seq(
    repeat(seq(multiplicative_operator, unary_expression)),
    repeat(
      seq(
        additive_operator,
        seq(
          unary_expression,
          repeat(seq(multiplicative_operator, unary_expression)),
        ).map(makeRepeatingBinaryExpression),
      ),
    ),
  ).map(([a, b]) => [...a, ...b]);

  return inTemplate ?
      or(shift_left, mul_add)
    : or(shift_left, shift_right, mul_add);
};
const relational_post_unary = (
  inTemplate: boolean,
): WeslParser<PartialBinaryExpression[]> => {
  return seq(
    shift_post_unary(inTemplate),
    opt(
      seq(
        // '<' is unambiguous, since templates were already caught by the primary expression inside of the previous unary_expression!
        inTemplate ?
          binaryOperator(["<", "<=", "!=", "=="])
        : binaryOperator([">", ">=", "<", "<=", "!=", "=="]),
        // TODO: I can skip template list discovery in this cases, because a>=b<c cannot be a comparison. Must be a template
        seq(unary_expression, shift_post_unary(inTemplate)).map(
          makeRepeatingBinaryExpression,
        ),
      ),
    ),
  ).map(([a, b]) => (b !== null ? [...a, b] : a));
};

/** The expression parser exists in two variants
 * `true` is template-expression: Refuses to parse parse symbols like `&&` and `||`.
 * `false` is maybe-template-expression: Does the template disambiguation.
 */
const expressionParser = (
  inTemplate: boolean,
): WeslParser<ExpressionElem<PT>> => {
  return seq(
    unary_expression,
    or(
      bitwise_post_unary,
      seq(
        relational_post_unary(inTemplate),
        inTemplate ?
          // Don't accept || or && in template mode
          yes()
        : or(
            repeatPlus(
              seq(
                binaryOperator("||"),
                seq(unary_expression, relational_post_unary(false)).map(
                  makeRepeatingBinaryExpression,
                ),
              ),
            ),
            repeatPlus(
              seq(
                binaryOperator("&&"),
                seq(unary_expression, relational_post_unary(false)).map(
                  makeRepeatingBinaryExpression,
                ),
              ),
            ),
            yes(),
          ),
      ).map(([a, b]) => (b !== null ? [...a, ...b] : a)),
    ),
  ).map(makeRepeatingBinaryExpression);
};

let maybe_template = false;
export const expression = expressionParser(maybe_template);
let is_template = true;
const template_arg_expression = expressionParser(is_template);

export const opt_template_list: WeslParser<ExpressionElem<PT>[] | null> = opt(
  delimited(
    templateOpen,
    withSepPlus(",", template_arg_expression),
    req(templateClose),
  ),
);

export const templated_ident: WeslParser<TemplatedIdentElem<PT>> = span(
  seq(full_ident, opt_template_list),
).map(makeTemplatedIdent);

export const argument_expression_list = delimited(
  "(",
  withSep(",", expression),
  req(")"),
);

//--------- Specialized parser for @if(expr) -----------//
const attribute_if_primary_expression: WeslParser<
  Literal | ParenthesizedExpression<PT> | TemplatedIdentElem<PT>
> = or(
  tokenOf("keyword", ["true", "false"]).map(makeLiteral),
  delimited(
    token("symbol", "("),
    fn(() => attribute_if_expression),
    token("symbol", ")"),
  ).map(makeParenthesizedExpression),
  full_ident.map(
    (v): TemplatedIdentElem<PT> => ({
      kind: "templated-ident",
      symbolRef: null,
      ident: v,
      span: v.span,
    }),
  ),
);

const attribute_if_unary_expression: WeslParser<ExpressionElem<PT>> = or(
  seq(
    unaryOperator("!"),
    fn(() => attribute_if_unary_expression),
  ).map(makeUnaryExpression),
  attribute_if_primary_expression,
);

export const attribute_if_expression: WeslParser<ExpressionElem<PT>> =
  weslExtension(
    seq(
      attribute_if_unary_expression,
      or(
        repeatPlus(
          seq(binaryOperator("||"), req(attribute_if_unary_expression)),
        ),
        repeatPlus(
          seq(binaryOperator("&&"), req(attribute_if_unary_expression)),
        ),
        yes().map(() => []),
      ),
    ).map(makeRepeatingBinaryExpression),
  );

export const lhs_expression: WeslParser<LhsExpression<PT>> = or(
  seq(full_ident.map(makeLhsIdentElem), opt(component_or_swizzle)).map(
    tryMakeLhsComponentOrSwizzle,
  ),
  seq(
    delimited("(", () => lhs_expression, ")").map(
      makeLhsParenthesizedExpression,
    ),
    opt(component_or_swizzle),
  ).map(tryMakeLhsComponentOrSwizzle),
  seq(lhsUnaryOperator("&"), () => lhs_expression).map(makeLhsUnaryExpression),
  seq(lhsUnaryOperator("*"), () => lhs_expression).map(makeLhsUnaryExpression),
);

function tryMakeFunctionCall([ident, args]: [
  TemplatedIdentElem<PT>,
  ExpressionElem<PT>[] | null,
]): TemplatedIdentElem<PT> | FunctionCallExpression<PT> {
  if (args !== null) {
    return {
      kind: "call-expression",
      function: ident,
      arguments: args,
    };
  } else {
    return ident;
  }
}

// LATER how do I combine the two?
function tryMakeComponentOrSwizzle([expression, componentOrSwizzle]: [
  ExpressionElem<PT>,
  (NameElem | ExpressionElem<PT>)[] | null,
]): ExpressionElem<PT> {
  if (componentOrSwizzle === null || componentOrSwizzle.length === 0) {
    return expression;
  }
  let result = expression;
  for (const v of componentOrSwizzle) {
    if (v.kind === "name") {
      result = {
        kind: "component-member-expression",
        access: v,
        base: result,
      };
    } else {
      result = {
        kind: "component-expression",
        access: v,
        base: result,
      };
    }
  }
  return result;
}
function tryMakeLhsComponentOrSwizzle([expression, componentOrSwizzle]: [
  LhsExpression<PT>,
  (NameElem | ExpressionElem<PT>)[] | null,
]): LhsExpression<PT> {
  if (componentOrSwizzle === null || componentOrSwizzle.length === 0) {
    return expression;
  }
  let result = expression;
  for (const v of componentOrSwizzle) {
    if (v.kind === "name") {
      result = {
        kind: "component-member-expression",
        access: v,
        base: result,
      };
    } else {
      result = {
        kind: "component-expression",
        access: v,
        base: result,
      };
    }
  }
  return result;
}

function makeTemplatedIdent({
  value: [full_ident, template],
  span,
}: {
  value: [FullIdent, ExpressionElem<PT>[] | null];
  span: Span;
}): TemplatedIdentElem<PT> {
  return {
    kind: "templated-ident",
    span,
    symbolRef: null,
    ident: full_ident,
    template: template ?? undefined,
  };
}
function makeLhsIdentElem(full_ident: FullIdent): LhsIdentElem<PT> {
  return {
    kind: "lhs-ident",
    symbolRef: null,
    name: full_ident,
  };
}

function makeLiteral(token: WeslToken<"keyword" | "number">): Literal {
  return {
    kind: "literal",
    value: token.text,
    span: token.span,
  };
}

function makeParenthesizedExpression(
  expression: ExpressionElem<PT>,
): ParenthesizedExpression<PT> {
  return {
    kind: "parenthesized-expression",
    expression,
  };
}
function makeLhsParenthesizedExpression(
  expression: LhsExpression<PT>,
): LhsParenthesizedExpression<PT> {
  return {
    kind: "parenthesized-expression",
    expression,
  };
}

function unaryOperator(
  text: UnaryOperator["value"] | UnaryOperator["value"][],
): WeslParser<UnaryOperator> {
  return (
    Array.isArray(text) ?
      tokenOf("symbol", text)
    : token("symbol", text)).map(token => ({
    value: token.text as any,
    span: token.span,
  }));
}
function lhsUnaryOperator(
  text: LhsUnaryOperator["value"] | LhsUnaryOperator["value"][],
): WeslParser<LhsUnaryOperator> {
  return (
    Array.isArray(text) ?
      tokenOf("symbol", text)
    : token("symbol", text)).map(token => ({
    value: token.text as any,
    span: token.span,
  }));
}

function binaryOperator(
  text: BinaryOperator["value"] | BinaryOperator["value"][],
): WeslParser<BinaryOperator> {
  return (
    Array.isArray(text) ?
      tokenOf("symbol", text)
    : token("symbol", text)).map(token => ({
    value: token.text as any,
    span: token.span,
  }));
}
function makeUnaryExpression([operator, expression]: [
  UnaryOperator,
  ExpressionElem<PT>,
]): UnaryExpression<PT> {
  return {
    kind: "unary-expression",
    operator,
    expression,
  };
}
function makeLhsUnaryExpression([operator, expression]: [
  LhsUnaryOperator,
  LhsExpression<PT>,
]): LhsUnaryExpression<PT> {
  return {
    kind: "unary-expression",
    operator,
    expression,
  };
}

type PartialBinaryExpression = [BinaryOperator, ExpressionElem<PT>];
/** A list of left-to-right associative binary expressions */
function makeRepeatingBinaryExpression([start, repeating]: [
  ExpressionElem<PT>,
  PartialBinaryExpression[],
]): ExpressionElem<PT> {
  let result: ExpressionElem<PT> = start;
  for (const [op, left] of repeating) {
    result = makeBinaryExpression([result, op, left]);
  }
  return result;
}
function makeBinaryExpression([left, operator, right]: [
  ExpressionElem<PT>,
  BinaryOperator,
  ExpressionElem<PT>,
]): BinaryExpression<PT> {
  return {
    kind: "binary-expression",
    operator,
    left,
    right,
  };
}

if (tracing) {
  const names: Record<string, WeslParser<unknown>> = {
    argument_expression_list,
    templated_ident,
    opt_template_list,
    literal,
    paren_expression,
    primary_expression,
    component_or_swizzle,
    unary_expression,
    expression,
    template_arg_expression,
  };

  Object.entries(names).forEach(([name, parser]) => {
    parser.setTraceName(name);
  });
}
