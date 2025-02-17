import {
  opt,
  seq,
  withSepPlus,
  or,
  kind,
  req,
  repeatPlus,
  preceded,
  collectArray,
  delimited,
  tagScope,
  Parser,
  Stream,
  repeat,
  yes,
  withSep,
  tracing,
  tokenOf,
  fn,
} from "mini-parse";
import {
  refIdent,
  nameCollect,
  stuffCollect,
  memberRefCollect,
  expressionCollect,
  typeRefCollect,
} from "../WESLCollect";
import { templateOpen, templateClose, WeslToken } from "./WeslStream";
import { number, qualified_ident, word } from "./WeslBaseGrammar";

/**
 * Aka template_elaborated_ident.post.ident
 * There is only one place in the grammar where template parsing is ambiguous.
 * This happens inside `expression`s, more specifically in `primary_expression`s.
 * When we encounter an expression like `a<foo`, we don't know what it will end up being.
 * The [template list discovery algorithm](https://www.w3.org/TR/WGSL/#template-lists-sec) roughly says
 * - `ident` `<` might be a template
 *   - Except `<<`, `<=` are not a template
 * - Then `>` closes the template
 *   - Note that `>=`, `>>` need to be split up when closing the template
 * - Brackets `()` `[]` work as usual
 * - A lot of characters cannot appear inside a template. These tell us that it wasn't a template.
 *   - `)` and `]` without a matching opening, e.g. `  foo<3)  `
 *   - `!=` and `==`
 *   - `;`, `{`, `:`
 *   - `&&` and `||`
 *
 * It is *not* ambiguous in the following cases
 * - variable_or_value_statement: Keyword like `var` before the `<`
 * - variable_updating_statement: Does not allow templates in `lhs_expression`
 * - type_specifier: Does not appear in an ambiguous position. (fn param, struct member)
 *   - optionally_typed_ident: Keyword like `var` before the `<`
 *   - param: fn param
 * - statement's ident branch: Looks ambigous with variable_updating_statement, but variable_updating_statement cannot have a template
 * - global_decl: No expressions allowed in those positions
 * - func_call_statement.post.ident: Not ambiguous.
 *   - `for_init`: Does not conflict with variable_or_value_statement, variable_updating_statement
 *   - `for_update`: Does not conflict with variable_updating_statement
 *
 * To rephrase all of that into a recursive descent parser that does not need to backtrack:
 * - In most places where a `<` appears in the grammar, we know it's a template.
 *   - Then, we can parse its arguments with a specialized expression parser that refuses to parse symbols like `&&` and `||`.
 *   - We call this a template-expression
 *   - e.g. `var<uniform> foo` cannot have `var<uniform && bar> foo`.
 *     Except a bracketed `var<(uniform && bar)> foo` is syntactically valid.
 * - The default mode for expressions is maybe-template-expression.
 *   - Note: Brackets also enter maybe-template-expression.
 * - In `primary_expression`, we can encounter a `<` which is maybe a template.
 *   This is ambiguous with `<` in `relational_expression.post.unary_expression`.
 *   So we need to parse, pretending that we're in both cases, until we hit a ending character (`>` or one of `)`, `]`, `!=`,...)
 *   - This relies on the syntax tree being the same in either case.
 * - The algorithm is
 *   - In bitwise_post_unary, always parse it as a template (no mixing `<` and `&`, `^`, `|`)
 *   - In relational_post_unary after the comparison symbol, always parse it as a template (only one comparison symbol is allowed)
 *   - Parse a `unary_expression` followed by a `shift_expression.post.unary_expression` after a `<` in `primary_expression`
 *     Three results are possible here: Template, not template or *unknown*.
 *   - If it's *unknown*, we peek one token ahead.
 *     - **Template**: `>`, `>=`, `<`, `<=`, `&`, `^`, `|`
 *       (the first two end the template, the other cannot be mixed with a `<` comparison, so they must be templates.)
 *       (`a < b <= c` is invalid after all, while `a < b <= c >`is valid)
 *       (`a < b | c` is invalid, while `a < b | c >`is valid)
 *     - **Error**: `!=`, `==`, because they cannot be in a template, and `a < b != c` is also invalid
 *     - **Not template - continue parsing**:  `&&`, `||`
 *       (from the template list discovery algorithm)
 *     - **Not template - end of expression**:  `)`,  `]`, `;`, `{`, `:`, `@`
 *       (from the template list discovery algorithm, and the `@` is for when an attribute follows an expression)
 *     - **Cannot happen**: `%`, `*`, `/`, `+`, `-` because `shift_expression.post.unary_expression` ate them
 *     - **Unknown-expression**: `,`. At this point we know that it's the end of an expression.
 *        We now need to parse the *next expressions* in a "maybe-template-end" mode, where we abort as soon as we see a `>`.
 *        Like `foo(a<b, 3, 5, 2, d>)`.
 */
export const opt_template_list = opt(
  seq(
    templateOpen,
    withSepPlus(",", () => template_parameter),
    templateClose,
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
  // Instead of parsing a template like so
  // seq(template_elaborated_ident, opt(fn(() => argument_expression_list))),
  // We apply the algorithm from above
  seq(
    fn(() => unary_expression),
    fn(() => shift_post_unary(true)),
    // And now we match on all the different variants
  ),
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
      // Not a template
      bitwise_post_unary,
      seq(
        relational_post_unary(inTemplate),
        inTemplate ?
          // Don't accept || or && in template mode
          yes()
        : or(
            // Not a template
            repeatPlus(
              seq("||", seq(unary_expression, relational_post_unary(false))),
            ),
            // Not a template
            repeatPlus(
              seq("&&", seq(unary_expression, relational_post_unary(false))),
            ),
            // Maybe a template
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
  word                              .collect(refIdent, "typeRefName"),
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
  // TODO: Remove this, it's wrong
  type_specifier.ctag("templateParam"),
  template_arg_expression.collect(expressionCollect, "templateParam")
);

export const argument_expression_list = seq(
  "(",
  withSep(",", expression),
  req(")"),
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
