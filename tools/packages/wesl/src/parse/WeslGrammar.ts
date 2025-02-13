import {
  collectArray,
  delimited,
  eof,
  fn,
  kind,
  opt,
  or,
  Parser,
  preceded,
  repeat,
  repeatPlus,
  req,
  seq,
  seqObj,
  span,
  Stream,
  tagScope,
  text,
  token,
  tokenKind,
  tokenOf,
  tracing,
  TypedToken,
  withSep,
  withSepPlus,
  yes,
} from "mini-parse";
import { weslImports } from "./ImportGrammar.ts";
import {
  templateClose,
  templateOpen,
  weslExtension,
  WeslToken,
  WeslTokenKind,
} from "./WeslStream.ts";
import {
  aliasCollect,
  collectAttribute,
  collectFn,
  collectFnParam,
  collectModule,
  collectSimpleElem,
  collectStruct,
  collectStructMember,
  collectVarLike,
  declCollect,
  expressionCollect,
  memberRefCollect,
  nameCollect,
  refIdent,
  scopeCollect,
  stuffCollect,
  typedDecl,
  typeRefCollect,
} from "../WESLCollect.ts";
import { mainTokens } from "../WESLTokens.ts";
import {
  BinaryExpression,
  BinaryOperator,
  DirectiveElem,
  ExpressionElem,
  LiteralElem,
  ParenthesizedExpression,
  RefIdentElem,
  TranslateTimeFeatureElem,
  UnaryExpression,
  UnaryOperator,
} from "../AbstractElems.ts";
import { terminated } from "mini-parse";

const word = kind(mainTokens.ident);

const full_ident = weslExtension(withSepPlus("::", word));

const diagnostic_rule_name = withSep(".", word, { requireOne: true }).map(v =>
  v.join("."),
);
const diagnostic_control = delimited(
  "(",
  seqObj({
    severity: word,
    _1: ",",
    rule: diagnostic_rule_name,
    _2: opt(","),
  }).map(({ severity, rule }): string[] => [severity, rule]),
  ")",
);

/** list of words that we don't need to collect (e.g. for @interpolate) */
const word_list = seq("(", withSep(",", word, { requireOne: true }), ")");

// prettier-ignore
const attribute = tagScope(
  seq(
    "@",
    req(
      or(
        // These attributes have no arguments
        or(
          "compute",
          "const",
          "fragment",
          "invariant",
          "must_use",
          "vertex",
        )                                 .ptag("name"),
        // These attributes have arguments, but the argument doesn't have any identifiers
        seq(
          or("interpolate", "builtin")    .ptag("name"),
          req(() => word_list),
        ),
        seq("diagnostic", diagnostic_control),
        // These are normal attributes
        seq(
          or(
            "workgroup_size",
            "align",
            "binding",
            "blend_src",
            "group",
            "id",
            "location",
            "size",
          )                               .ptag("name"),
          req(() => attribute_argument_list),
        ),
        // Everything else is also a normal attribute, it might have an expression list
        seq(
          word,
          opt(() => attribute_argument_list),
        ),
      ),
    ),
  )                                       .collect(collectAttribute),
)                                         .ctag("attribute");

// prettier-ignore
const attribute_argument_list = seq(
  "(",
  withSep(
    ",",
    fn(() => expression)               .collect(expressionCollect, "attrParam"),
  ),
  req(")"),
);

const argument_expression_list = seq(
  "(",
  withSep(",", () => expression),
  req(")"),
);

const opt_attributes = repeat(attribute);

/** parse an identifier into a TypeNameElem */
// prettier-ignore
const typeNameDecl = 
  req(
    word                            .collect(declCollect, "type_name")
  );

/** parse an identifier into a TypeNameElem */
// prettier-ignore
const fnNameDecl = 
  req(
    word                            .collect(declCollect, "fn_name"),
    "missing fn name",
  );

// prettier-ignore
const type_specifier: Parser<Stream<WeslToken>,any> = tagScope(
  seq(
    full_ident                        .collect(refIdent, "typeRefName"),
    () => opt_template_list,
  )                                   .collect(typeRefCollect),
)                                     .ctag("typeRefElem");

// prettier-ignore
const optionally_typed_ident = tagScope(
  seq(
    word                              .collect(declCollect, "decl_elem"),
    opt(seq(":", type_specifier)),
  )                                   .collect(typedDecl)
)                                     .ctag("var_name");

const req_optionally_typed_ident = req(optionally_typed_ident);

// prettier-ignore
const struct_member = tagScope(
  seq(
    opt_attributes,
    word                              .collect(nameCollect, "nameElem"),
    ":",
    req(type_specifier),
  )                                   .collect(collectStructMember)
)                                     .ctag("members");

// prettier-ignore
const struct_decl = seq(
  "struct",
  req(typeNameDecl),
  seq(
    req("{"),
    withSepPlus(",", struct_member),
    req("}"),
  )                                   .collect(scopeCollect(), "struct_scope"),
)                                     .collect(collectStruct);

/** Also covers func_call_statement.post.ident */
// prettier-ignore
const fn_call = seq(
  full_ident                     .collect(refIdent),
  () => opt_template_list,
  argument_expression_list,
);

// prettier-ignore
const fnParam = tagScope(
  seq(
    opt_attributes,
    word                              .collect(declCollect, "decl_elem"),
    opt(seq(":", req(type_specifier))).collect(typedDecl, "param_name"),
  )                                   .collect(collectFnParam),
)                                     .ctag("fnParam");

const fnParamList = seq("(", withSep(",", fnParam), ")");

// prettier-ignore
const local_variable_decl = seq(
  "var",
  () => opt_template_list,
  req_optionally_typed_ident,
  opt(seq("=", () => expression)),    // no decl_scope, but I think that's ok
)                                     .collect(collectVarLike("var"));

// prettier-ignore
const global_variable_decl = seq(
  "var",
  () => opt_template_list,
  req_optionally_typed_ident,
                                      // TODO shouldn't decl_scope include the ident type?
  opt(seq("=", () => expression       .collect(scopeCollect(), "decl_scope"))),
);

/** Aka template_elaborated_ident.post.ident */
const opt_template_list = opt(
  seq(
    templateOpen,
    withSepPlus(",", () => template_parameter),
    templateClose,
  ),
);

// prettier-ignore
const template_elaborated_ident = 
  seq(
    full_ident                           .collect(refIdent),
    opt_template_list,
  );

const literal = or("true", "false", kind(mainTokens.digits));

const paren_expression = seq("(", () => expression, req(")"));

const call_expression = seq(
  template_elaborated_ident,
  argument_expression_list,
);

const primary_expression = or(
  literal,
  paren_expression,
  call_expression,
  template_elaborated_ident,
);

const component_or_swizzle = repeatPlus(
  or(
    preceded(".", word),
    collectArray(delimited("[", () => expression, req("]"))),
  ),
);

// TODO: Remove
// prettier-ignore
/** parse simple struct.member style references specially, for binding struct lowering */
const simple_component_reference = tagScope(
  seq(
    full_ident                        .collect(refIdent, "structRef"),
    seq(".", word                     .collect(nameCollect, "component")),
    opt(component_or_swizzle          .collect(stuffCollect, "extra_components")),
  )                                   .collect(memberRefCollect),
);

/**
 * bitwise_expression.post.unary_expression
 * & ^ |
 * expression
 * && ||
 * relational_expression.post.unary_expression
 * > >= < <= != ==
 * shift_expression.post.unary_expression
 * % * / + - << >>
 */
const makeExpressionOperator = (isTemplate: boolean) => {
  const allowedOps = (
    "& | ^ << <= < != == % * / + -" + (isTemplate ? "" : " && || >> >= >")
  ).split(" ");
  return or(...allowedOps);
};

const unary_expression: Parser<Stream<WeslToken>, any> = or(
  seq(or(..."! & * - ~".split(" ")), () => unary_expression),
  or(
    simple_component_reference,
    seq(primary_expression, opt(component_or_swizzle)),
  ),
);

const makeExpression = (isTemplate: boolean) => {
  return seq(
    unary_expression,
    repeat(seq(makeExpressionOperator(isTemplate), unary_expression)),
  );
};

export const expression = makeExpression(false);
const template_arg_expression = makeExpression(true);

/** a template_arg_expression with additional collection for parameters
 * that are types like array<f32> vs. expressions like 1+2 */
// prettier-ignore
const template_parameter = or(
  // TODO: Remove this, it's wrong
  type_specifier                    .ctag("templateParam"),
  template_arg_expression           .collect(expressionCollect, "templateParam"),
);

const attribute_if_primary_expression: Parser<
  Stream<WeslToken>,
  LiteralElem | ParenthesizedExpression | TranslateTimeFeatureElem
> = or(
  tokenOf("keyword", ["true", "false"]).map(makeLiteral),
  seq(
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

const unscoped_compound_statement = seq(
  opt_attributes,
  text("{"),
  repeat(() => statement),
  req("}"),
);

// prettier-ignore
const compound_statement = seq(
  opt_attributes,
  seq(
    text("{"),
    repeat(() => statement),
    req("}"),
  )                                 .collect(scopeCollect()),
);

const for_init = or(
  fn_call,
  () => variable_or_value_statement,
  () => variable_updating_statement,
);

const for_update = or(fn_call, () => variable_updating_statement);

// prettier-ignore
const for_statement = seq(
  opt_attributes,
  "for",
  seq(
    req("("),
    opt(for_init),
    req(";"),
    opt(expression),
    req(";"),
    opt(for_update),
    req(")"),
    unscoped_compound_statement,
  )                                 .collect(scopeCollect()),
);

const if_statement = seq(
  opt_attributes,
  "if",
  req(seq(expression, compound_statement)),
  repeat(seq("else", "if", req(seq(expression, compound_statement)))),
  opt(seq("else", req(compound_statement))),
);

const loop_statement = seq(
  opt_attributes,
  "loop",
  opt_attributes,
  req(
    seq(
      "{",
      repeat(() => statement),
      opt(
        seq(
          "continuing",
          opt_attributes,
          "{",
          repeat(() => statement),
          opt(seq("break", "if", expression, ";")),
          "}",
        ),
      ),
      "}",
    ),
  ),
);

const case_selector = or("default", expression);
const switch_clause = or(
  seq(
    "case",
    withSep(",", case_selector, { requireOne: true }),
    opt(":"),
    compound_statement,
  ),
  seq("default", opt(":"), compound_statement),
);

const switch_body = seq(opt_attributes, "{", repeatPlus(switch_clause), "}");
const switch_statement = seq(opt_attributes, "switch", expression, switch_body);

const while_statement = seq(
  opt_attributes,
  "while",
  expression,
  compound_statement,
);

const statement: Parser<Stream<WeslToken>, any> = or(
  for_statement,
  if_statement,
  loop_statement,
  switch_statement,
  while_statement,
  compound_statement,
  seq("break", ";"),
  seq("continue", ";"),
  seq(";"),
  () => const_assert,
  seq("discard", ";"),
  seq("return", opt(expression), ";"),
  seq(fn_call, ";"),
  seq(() => variable_or_value_statement, ";"),
  seq(() => variable_updating_statement, ";"),
);

// prettier-ignore
const lhs_expression: Parser<Stream<WeslToken>,any> = or(
  simple_component_reference,
  seq(
    full_ident                        .collect(refIdent), 
    opt(component_or_swizzle)
  ),
  seq(
    "(", 
    () => lhs_expression, 
    ")", 
    opt(component_or_swizzle)         // LATER this doesn't find member references.
  ),
  seq("&", () => lhs_expression),
  seq("*", () => lhs_expression),
);

// prettier-ignore
const variable_or_value_statement = tagScope(
    or(
    // Also covers the = expression case
    local_variable_decl,
    seq("const", req_optionally_typed_ident, req("="), expression), // TODO collect
    seq(
      "let", 
      req_optionally_typed_ident          .ctag("var_name"), // TODO scope??
      req("="),
      expression
      )                                   .collect(collectVarLike("let"),
    ),
  )
);

const variable_updating_statement = or(
  seq(
    lhs_expression,
    or("=", "<<=", ">>=", "%=", "&=", "*=", "+=", "-=", "/=", "^=", "|="),
    expression,
  ),
  seq(lhs_expression, or("++", "--")),
  seq("_", "=", expression),
);

// prettier-ignore
const fn_decl = seq(
  opt_attributes                      .collect((cc) => cc.tags.attribute, "fn_attributes"), // filter out empties
  text("fn"),
  req(fnNameDecl),
  seq(
    req(fnParamList),
    opt(seq(
      "->", 
      opt_attributes, 
      type_specifier                  .ctag("returnType"))),
    req(unscoped_compound_statement),
  )                                   .collect(scopeCollect(), "body_scope"),
)                                     .collect(collectFn);

// prettier-ignore
const global_value_decl = or(
  seq(
    opt_attributes,
    "override",
    optionally_typed_ident,
    seq(opt(seq("=", expression       .collect(scopeCollect(), "decl_scope")))),
    ";",
  )                                   .collect(collectVarLike("override")),
  seq(
    "const",
    optionally_typed_ident,
    "=",
    seq(expression)                   .collect(scopeCollect(), "decl_scope"),
    ";",
  )                                   .collect(collectVarLike("const")),
);

// prettier-ignore
const global_alias = seq(
  "alias",
  req(word)                           .collect(declCollect, "alias_name"),
  req("="),
  req(type_specifier)                 .collect(scopeCollect(), "alias_scope"),
  req(";"),
)                                     .collect(aliasCollect);

// prettier-ignore
const const_assert = 
  seq(
    "const_assert", 
    req(expression), 
    ";"
  )                                   .collect(collectSimpleElem("assert"),
);

const global_directive = span(
  terminated(
    or(
      seq("diagnostic", diagnostic_control),
      seq("enable", withSep(",", word, { requireOne: true })),
      seq("requires", withSep(",", word, { requireOne: true })),
    ),
    ";",
  ),
).map(
  ({ value: [directive, args], span: [start, end] }): DirectiveElem => ({
    kind: "directive",
    directive: directive as "diagnostic" | "enable" | "requires",
    arguments: args,
    start,
    end,
  }),
);

// prettier-ignore
// TODO: Hoist out the "opt_attributes"
const global_decl = tagScope(
  or(
    fn_decl,
    seq(
      opt_attributes, 
      global_variable_decl, 
      ";")                          .collect(collectVarLike("gvar")),
    global_value_decl,
    ";",
    global_alias,
    const_assert,
    struct_decl,
  ),
);

// prettier-ignore
export const weslRoot = seq(
    weslExtension(weslImports),
    repeat(global_directive),
    repeat(global_decl),
    req(eof()),
  )                                 .collect(collectModule, "collectModule");

function makeLiteral(token: WeslToken<"keyword" | "number">): LiteralElem {
  return {
    kind: "literal",
    value: token.text,
    srcModule: null as any, // TODO: Remove this from the syntax tree (space shrinking)
    start: token.span[0],
    end: token.span[1],
  };
}

function makeTranslateTimeFeature(
  token: WeslToken<"word">,
): TranslateTimeFeatureElem {
  return {
    kind: "translate-time-feature",
    name: token.text,
    start: token.span[0],
    end: token.span[1],
  };
}

function makeParenthesizedExpression([leftBracket, expression, rightBracket]: [
  WeslToken<"symbol">,
  ExpressionElem,
  WeslToken<"symbol">,
]): ParenthesizedExpression {
  return {
    kind: "parenthesized-expression",
    expression,
    start: leftBracket.span[0],
    end: rightBracket.span[1],
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
    start: operator.span[0],
    end: expression.end,
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
    start: left.start,
    end: right.end,
  };
}

if (tracing) {
  const names: Record<string, Parser<Stream<WeslToken>, unknown>> = {
    full_ident,
    diagnostic_rule_name,
    diagnostic_control,
    attribute,
    argument_expression_list,
    opt_attributes,
    typeNameDecl,
    fnNameDecl,
    type_specifier,
    optionally_typed_ident,
    struct_member,
    struct_decl,
    fn_call,
    fnParam,
    fnParamList,
    local_variable_decl,
    global_variable_decl,
    opt_template_list,
    template_elaborated_ident,
    literal,
    paren_expression,
    call_expression,
    primary_expression,
    component_or_swizzle,
    unary_expression,
    expression,
    template_arg_expression,
    compound_statement,
    for_init,
    for_update,
    for_statement,
    if_statement,
    loop_statement,
    case_selector,
    switch_clause,
    switch_body,
    switch_statement,
    while_statement,
    statement,
    lhs_expression,
    variable_or_value_statement,
    variable_updating_statement,
    fn_decl,
    global_value_decl,
    global_alias,
    const_assert,
    global_directive,
    global_decl,
    weslRoot,
  };

  Object.entries(names).forEach(([name, parser]) => {
    parser.setTraceName(name);
  });
}
