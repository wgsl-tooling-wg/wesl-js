import {
  collectArray,
  delimited,
  fn,
  opt,
  or,
  Parser,
  preceded,
  repeat,
  repeatPlus,
  req,
  seq,
  Stream,
  tagScope,
  token,
  tokenOf,
  tracing,
  withSep,
  withSepPlus,
  yes,
} from "mini-parse";
import {
  expressionCollect,
  memberRefCollect,
  nameCollect,
  refIdent,
  stuffCollect,
  typeRefCollect,
} from "../WESLCollect";
import { number, qualified_ident, word, name } from "./BaseGrammar";
import {
  templateClose,
  templateOpen,
  weslExtension,
  WeslToken,
} from "./WeslStream";
import {
  BinaryExpression,
  BinaryOperator,
  ExpressionElem,
  Literal,
  ParenthesizedExpression,
  UnaryExpression,
  UnaryOperator,
} from "./ExpressionElem";
import { NameElem } from "../AbstractElems";

export const opt_template_list = opt(
  seq(
    templateOpen,
    withSepPlus(",", () => template_parameter),
    req(templateClose),
  ),
);

// prettier-ignore
const template_elaborated_ident = seq(
  qualified_ident.collect(refIdent),
  opt_template_list
);
const literal = or("true", "false", number);
const paren_expression = seq("(", () => expression, req(")"));

const primary_expression = or(
  literal,
  paren_expression,
  seq(template_elaborated_ident, opt(fn(() => argument_expression_list))),
);
export const component_or_swizzle = repeatPlus(
  or(
    preceded(".", word),
    collectArray(delimited("[", () => expression, req("]"))),
  ),
);
// TODO: Remove
// prettier-ignore
/** parse simple struct.member style references specially, for binding struct lowering */
export const simple_component_reference = tagScope(
  seq(
    qualified_ident.collect(refIdent, "structRef"),
    seq(".", word.collect(nameCollect, "component")),
    opt(component_or_swizzle.collect(stuffCollect, "extra_components"))
  ).collect(memberRefCollect)
);
const unary_expression: Parser<Stream<WeslToken>, any> = or(
  seq(tokenOf("symbol", ["!", "&", "*", "-", "~"]), () => unary_expression),
  or(
    simple_component_reference,
    seq(primary_expression, opt(component_or_swizzle)),
  ),
);
const bitwise_post_unary = or(
  // TODO: I can skip template list discovery in these cases, because a&b<c cannot be a comparison. Must be a template
  repeatPlus(seq("&", unary_expression)),
  repeatPlus(seq("^", unary_expression)),
  repeatPlus(seq("|", unary_expression)),
);
const multiplicative_operator = or("%", "*", "/");
const additive_operator = or("+", "-");
const shift_post_unary = (inTemplate: boolean) => {
  const shift_left = seq("<<", unary_expression);
  const shift_right = seq(">>", unary_expression);
  const mul_add = seq(
    repeat(seq(multiplicative_operator, unary_expression)),
    repeat(
      seq(
        additive_operator,
        unary_expression,
        repeat(seq(multiplicative_operator, unary_expression)),
      ),
    ),
  );
  return inTemplate ?
      or(shift_left, mul_add)
    : or(shift_left, shift_right, mul_add);
};
const relational_post_unary = (inTemplate: boolean) => {
  return seq(
    shift_post_unary(inTemplate),
    opt(
      seq(
        // '<' is unambiguous, since templates were already caught by the primary expression inside of the previous unary_expression!
        inTemplate ?
          tokenOf("symbol", ["<", "<=", "!=", "=="])
        : tokenOf("symbol", [">", ">=", "<", "<=", "!=", "=="]),
        // TODO: I can skip template list discovery in this cases, because a>=b<c cannot be a comparison. Must be a template
        unary_expression,
        shift_post_unary(inTemplate),
      ),
    ),
  );
};

/** The expression parser exists in two variants
 * `true` is template-expression: Refuses to parse parse symbols like `&&` and `||`.
 * `false` is maybe-template-expression: Does the template disambiguation.
 */
const expressionParser = (
  inTemplate: boolean,
): Parser<Stream<WeslToken>, any> => {
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
              seq("||", seq(unary_expression, relational_post_unary(false))),
            ),
            repeatPlus(
              seq("&&", seq(unary_expression, relational_post_unary(false))),
            ),
            yes().map(() => []),
          ),
      ),
    ),
  );
};

let maybe_template = false;
export const expression = expressionParser(maybe_template);
let is_template = true;
const template_arg_expression = expressionParser(is_template);

export const type_specifier: Parser<Stream<WeslToken>, any> = tagScope(
  seq(
    qualified_ident.collect(refIdent, "typeRefName"),
    opt_template_list,
  ).collect(typeRefCollect),
).ctag("typeRefElem");

/** a template_arg_expression with additional collection for parameters
 * that are types like array<f32> vs. expressions like 1+2 */
// prettier-ignore
const template_parameter = or(
  // TODO: Remove this, it's wrong
  type_specifier.ctag("templateParam"),
  template_arg_expression.collect(expressionCollect, "templateParam")
);

export const argument_expression_list = seq(
  "(",
  withSep(",", expression),
  req(")"),
);

//--------- Specialized parser for @if(expr) -----------//
const attribute_if_primary_expression: Parser<
  Stream<WeslToken>,
  Literal | ParenthesizedExpression | NameElem
> = or(
  tokenOf("keyword", ["true", "false"]).map(makeLiteral),
  delimited(
    token("symbol", "("),
    fn(() => attribute_if_expression),
    token("symbol", ")"),
  ).map(makeParenthesizedExpression),
  name,
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

export const attribute_if_expression: Parser<
  Stream<WeslToken>,
  ExpressionElem
> = weslExtension(
  seq(
    attribute_if_unary_expression,
    or(
      repeatPlus(
        seq(
          token("symbol", "||").map(makeBinaryOperator),
          req(attribute_if_unary_expression),
        ),
      ),
      repeatPlus(
        seq(
          token("symbol", "&&").map(makeBinaryOperator),
          req(attribute_if_unary_expression),
        ),
      ),
      yes().map(() => []),
    ),
  ).map(makeRepeatingBinaryExpression),
);

function makeLiteral(token: WeslToken<"keyword" | "number">): Literal {
  return {
    kind: "literal",
    value: token.text,
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
  return {
    value: token.text as any,
    span: token.span,
  };
}
function makeBinaryOperator(token: WeslToken<"symbol">): BinaryOperator {
  return {
    value: token.text as any,
    span: token.span,
  };
}
function makeUnaryExpression([operator, expression]: [
  UnaryOperator,
  ExpressionElem,
]): UnaryExpression {
  return {
    kind: "unary-expression",
    operator,
    expression,
  };
}
/** A list of left-to-right associative binary expressions */
function makeRepeatingBinaryExpression([start, repeating]: [
  ExpressionElem,
  [BinaryOperator, ExpressionElem][],
]): ExpressionElem {
  let result: ExpressionElem = start;
  for (const [op, left] of repeating) {
    result = makeBinaryExpression([result, op, left]);
  }
  return result;
}
function makeBinaryExpression([left, operator, right]: [
  ExpressionElem,
  BinaryOperator,
  ExpressionElem,
]): BinaryExpression {
  return {
    kind: "binary-expression",
    operator,
    left,
    right,
  };
}

if (tracing) {
  const names: Record<string, Parser<Stream<WeslToken>, unknown>> = {
    argument_expression_list,
    type_specifier,
    opt_template_list,
    template_elaborated_ident,
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
