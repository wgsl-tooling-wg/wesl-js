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
import { number, qualified_ident, word } from "./WeslBaseGrammar";
import { templateClose, templateOpen, WeslToken } from "./WeslStream";

export const opt_template_list = opt(
  seq(
    templateOpen,
    withSepPlus(",", () => template_parameter),
    req(templateClose, "invalid template, expected >"),
  ),
);

// prettier-ignore
const template_elaborated_ident = seq(
  qualified_ident.collect(refIdent),
  opt_template_list
);
const literal = or("true", "false", number);
const paren_expression = seq(
  "(",
  () => expression,
  req(")", "invalid expression, expected )"),
);

const primary_expression = or(
  literal,
  paren_expression,
  seq(template_elaborated_ident, opt(fn(() => argument_expression_list))),
);
export const component_or_swizzle = repeatPlus(
  or(
    preceded(".", word),
    collectArray(
      delimited(
        "[",
        () => expression,
        req("]", "invalid expression, expected ]"),
      ),
    ),
  ),
);
// LATER Remove
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
  // LATER I can skip template list discovery in these cases, because a&b<c cannot be a comparison. Must be a template
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
        // LATER I can skip template list discovery in this cases, because a>=b<c cannot be a comparison. Must be a template
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

// prettier-ignore
const std_type_specifier = seq(
  qualified_ident                   .collect(refIdent, "typeRefName"),
  () => opt_template_list,
)                                   .collect(typeRefCollect);

// prettier-ignore
export const type_specifier: Parser<Stream<WeslToken>,any> = tagScope(
   std_type_specifier,
)                                   .ctag("typeRefElem");

/** a template_arg_expression with additional collection for parameters
 * that are types like array<f32> vs. expressions like 1+2 */
// prettier-ignore
const template_parameter = or(
  // LATER Remove this, it's wrong. This should instead be done by inspecting the syntax tree.
  type_specifier.ctag("templateParam"),
  template_arg_expression.collect(expressionCollect, "templateParam")
);

export const argument_expression_list = seq(
  "(",
  withSep(",", expression),
  req(")", "invalid fn arguments, expected )"),
);

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
