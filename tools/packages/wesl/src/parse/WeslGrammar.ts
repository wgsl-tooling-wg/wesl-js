import {
  delimited,
  eof,
  fn,
  opt,
  or,
  Parser,
  preceded,
  repeat,
  repeatPlus,
  req,
  separated_pair,
  seq,
  Span,
  span,
  Stream,
  tagScope,
  terminated,
  text,
  token,
  tokenKind,
  tokenOf,
  tracing,
  withSep,
  withSepPlus,
  yes,
} from "mini-parse";
import {
  BinaryExpression,
  BinaryOperator,
  BuiltinAttribute,
  DiagnosticAttribute,
  DiagnosticDirective,
  EnableDirective,
  ExpressionElem,
  IfAttribute,
  InterpolateAttribute,
  Literal,
  NameElem,
  ParenthesizedExpression,
  RequiresDirective,
  StandardAttribute,
  TranslateTimeExpressionElem,
  TranslateTimeFeature,
  UnaryExpression,
  UnaryOperator,
  UnknownExpressionElem,
} from "../AbstractElems.ts";
import {
  aliasCollect,
  collectAttribute,
  collectFn,
  collectFnParam,
  collectModule,
  collectStruct,
  collectStructMember,
  collectVarLike,
  constAssertCollect,
  declCollect,
  directiveCollect,
  expressionCollect,
  nameCollect,
  partialScopeCollect,
  refIdent,
  scopeCollect,
  specialAttribute,
  statementCollect,
  switchClauseCollect,
  typedDecl,
} from "../WESLCollect.ts";
import { weslImports } from "./ImportGrammar.ts";
import { qualified_ident, word } from "./WeslBaseGrammar.ts";
import {
  argument_expression_list,
  component_or_swizzle,
  expression,
  opt_template_list,
  simple_component_reference,
  type_specifier,
} from "./WeslExpression.ts";
import { weslExtension, WeslToken } from "./WeslStream.ts";

const name = tokenKind("word").map(makeName);

const diagnostic_rule_name = seq(name, opt(preceded(".", req(name))));
const diagnostic_control = delimited(
  "(",
  separated_pair(name, ",", diagnostic_rule_name),
  seq(opt(","), ")"),
);

/** list of words that aren't identifiers (e.g. for @interpolate) */
const name_list = withSep(",", name, { requireOne: true });

// prettier-ignore
const special_attribute = tagScope(
  preceded("@", 
    or(
      // These attributes have no arguments
      or("compute", "const", "fragment", "invariant", "must_use", "vertex")
                                        .map(name => makeStandardAttribute([name, []])),

      // These attributes have arguments, but the argument doesn't have any identifiers
      preceded("interpolate", req(delimited("(", name_list, ")")))
                                        .map(makeInterpolateAttribute),
      preceded("builtin", req(delimited("(", name, ")")))
                                        .map(makeBuiltinAttribute),
      preceded("diagnostic", req(diagnostic_control))
                                        .map(makeDiagnosticAttribute),
    )                                     .ptag("attr_variant")  
  )                                       .collect(specialAttribute)
);

// prettier-ignore
const if_attribute = tagScope(
  preceded(seq("@", weslExtension("if")),
    span(
      delimited(
        "(",
        fn(() => attribute_if_expression),
        seq(opt(","), ")"),
      ),
    )                               .map(makeTranslateTimeExpressionElem),
  )                                 .map(makeIfAttribute)
                                      .ptag("attr_variant")
                                      .collect(specialAttribute)
);

// prettier-ignore
const normal_attribute = tagScope(
  preceded("@",
    or(
      // These are normal attributes, with required arguments
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
        )                        .ptag("name"),
        req(() => attribute_argument_list),
      ),

      // Everything else is also a normal attribute, optional expression list
      seq(
        // we don't want this to interfere with if_attribute, 
        // but not("if") isn't necessary for now, since 'if' is a keyword, not a word
        word                     .ptag("name"),
        opt(() => attribute_argument_list),
      ),
    ),
  )                              .collect(collectAttribute),
);

// prettier-ignore
const attribute_argument_list = delimited(
  "(",
  withSep(
    ",",
    span(fn(() => expression))     .collect(expressionCollect, "attrParam"), // LATER These unknown expressions have decls inside of them, that's why they're tough to replace!
  ),
  req(")"),
);

// separate statements with if from statements

// prettier-ignore
const attribute_no_if = or(
  special_attribute, 
  normal_attribute
)                                   .ctag("attribute");

// prettier-ignore
const attribute_incl_if = or(
  if_attribute,
  special_attribute,
  normal_attribute,
)                                   .ctag("attribute");

const opt_attributes = repeat(attribute_incl_if);

const opt_attributes_no_if = repeat(attribute_no_if);

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
  weslExtension(opt_attributes)       .collect((cc) => cc.tags.attribute, "attributes"),
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
  qualified_ident                     .collect(refIdent),
  () => opt_template_list,
  argument_expression_list,
);

// prettier-ignore
const fnParam = tagScope(
  seq(
    opt_attributes                    .collect((cc) => cc.tags.attribute, "attributes"),
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
).collect(statementCollect);

// prettier-ignore
const compound_statement = tagScope(
  seq(
    opt_attributes,
    seq(
      text("{"),
      repeat(() => statement),
      req("}"),
    )                                 .collect(scopeCollect()),
  )                                   .collect(statementCollect)
);

const for_init = seq(
  opt_attributes, // TODO: Collect
  or(
    fn_call,
    () => variable_or_value_statement,
    () => variable_updating_statement,
  ), // TODO: collect as AnyStatement and add the attributes
);

const for_update = seq(
  opt_attributes, // TODO: Collect and attach
  or(fn_call, () => variable_updating_statement),
);

// prettier-ignore
const for_statement = seq(
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
  "if",
  req(seq(expression, compound_statement)),
  repeat(seq("else", "if", req(seq(expression, compound_statement)))),
  opt(seq("else", req(compound_statement))),
);

const loop_statement = seq(
  "loop",
  opt_attributes, // TODO: collect and attach to scope 1
  req(
    seq(
      "{",
      repeat(() => statement),
      opt(
        seq(
          "continuing",
          opt_attributes, // TODO: collect and attach to scope 2
          "{",
          repeat(() => statement),
          opt(seq("break", "if", expression, ";")),
          "}", // TODO: Scope 2 collect
        ),
      ),
      "}", // TODO: Scope 1 collect
    ),
  ),
);

const case_selector = or("default", expression);

// prettier-ignore
const switch_clause =                   tagScope(
  seq(
    opt_attributes,
    or(
      seq(
        "case",
        withSep(",", case_selector, { requireOne: true }),
        opt(":"),
        compound_statement,
      ),
      seq("default", opt(":"), compound_statement),
    ).                                    collect(switchClauseCollect), // TODO: collect as SwitchClause
  )
);
const switch_body = seq(opt_attributes, "{", repeatPlus(switch_clause), "}");
const switch_statement = seq("switch", expression, switch_body);

const while_statement = seq("while", expression, compound_statement);

const regular_statement = or(
  for_statement,
  if_statement,
  loop_statement,
  switch_statement,
  while_statement,
  seq("break", ";"),
  seq("continue", ";"),
  seq(";"), // LATER this one cannot have attributes in front of it
  () => const_assert,
  seq("discard", ";"),
  seq("return", opt(expression), ";"),
  seq(fn_call, ";"),
  seq(() => variable_or_value_statement, ";"),
  seq(() => variable_updating_statement, ";"),
);

// prettier-ignore
const conditional_statement = tagScope(
  seq(
    opt_attributes, 
    regular_statement
  )                                .collect(statementCollect)
                                   .collect(partialScopeCollect()));

// prettier-ignore
const unconditional_statement = tagScope(
  seq(
    opt_attributes_no_if, 
    regular_statement,
  )
);

// prettier-ignore
const statement: Parser<Stream<WeslToken>, any> = or(
  compound_statement,
  unconditional_statement,
  conditional_statement
);

// prettier-ignore
const lhs_expression: Parser<Stream<WeslToken>,any> = or(
  simple_component_reference,
  seq(
    qualified_ident                        .collect(refIdent), 
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
                                      tagScope(
    opt_attributes                      .collect((cc) => cc.tags.attribute || []),
  )                                     .ctag("fn_attributes"),
  text("fn"),
  req(fnNameDecl),
  seq(
    req(fnParamList),
    opt(seq(
      "->", 
      opt_attributes                  .collect((cc) => cc.tags.attribute, "return_attributes"),
      type_specifier                  .ctag("returnType"))),
    req(unscoped_compound_statement)  .ctag("body"),
  )                                   .collect(scopeCollect(), "body_scope"),
)                                     .collect(collectFn);

// prettier-ignore
const global_value_decl = or(
  seq(
    opt_attributes                    .collect((cc) => cc.tags.attribute, "attributes"), // TODO: attach to override
    "override",
    optionally_typed_ident,
    seq(opt(seq("=", expression       .collect(scopeCollect(), "decl_scope")))),
    ";",
  )                                   .collect(collectVarLike("override")),
  seq(
    opt_attributes                    .collect((cc) => cc.tags.attribute, "attributes"), // TODO: attach to const
    "const",
    optionally_typed_ident,
    "=",
    seq(expression)                   .collect(scopeCollect(), "decl_scope"),
    ";",
  )                                   .collect(collectVarLike("const")),
);

// prettier-ignore
const global_alias = seq(
  weslExtension(opt_attributes)       .collect((cc) => cc.tags.attribute, "attributes"),
  "alias",
  req(word)                           .collect(declCollect, "alias_name"),
  req("="),
  req(type_specifier)                 .collect(scopeCollect(), "alias_scope"),
  req(";"),
)                                     .collect(aliasCollect);

// prettier-ignore
const const_assert = 
  seq(
    opt_attributes,
    "const_assert", 
    req(expression), 
    ";"
  )                                   .collect(constAssertCollect);

// prettier-ignore
const global_directive = tagScope(
  seq(
    opt_attributes,
    terminated(
      or(
        preceded("diagnostic", diagnostic_control)      .map(makeDiagnosticDirective),
        preceded("enable", name_list)                   .map(makeEnableDirective),
        preceded("requires", name_list)                 .map(makeRequiresDirective),
      )                                                   .ptag("directive"),
      ";",
    ),
  )                                                        .collect(directiveCollect)
);

// prettier-ignore
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

function makeDiagnosticDirective([severity, rule]: readonly [
  NameElem,
  [NameElem, NameElem | null],
]): DiagnosticDirective {
  return { kind: "diagnostic", severity, rule };
}

function makeEnableDirective(extensions: NameElem[]): EnableDirective {
  return { kind: "enable", extensions };
}

function makeRequiresDirective(extensions: NameElem[]): RequiresDirective {
  return { kind: "requires", extensions };
}

function makeStandardAttribute([name, params]: [
  string,
  UnknownExpressionElem[],
]): StandardAttribute {
  return {
    kind: "@attribute",
    name,
    params,
  };
}

function makeInterpolateAttribute(params: NameElem[]): InterpolateAttribute {
  return {
    kind: "@interpolate",
    params,
  };
}

function makeBuiltinAttribute(param: NameElem): BuiltinAttribute {
  return {
    kind: "@builtin",
    param,
  };
}

function makeDiagnosticAttribute([severity, rule]: readonly [
  NameElem,
  [NameElem, NameElem | null],
]): DiagnosticAttribute {
  return {
    kind: "@diagnostic",
    severity,
    rule,
  };
}

function makeIfAttribute(param: TranslateTimeExpressionElem): IfAttribute {
  return {
    kind: "@if",
    param,
  };
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

function makeName(token: WeslToken<"word">): NameElem {
  return {
    kind: "name",
    name: token.text,
    start: token.span[0],
    end: token.span[1],
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
    qualified_ident,
    diagnostic_rule_name,
    diagnostic_control,
    opt_attributes,
    typeNameDecl,
    fnNameDecl,
    optionally_typed_ident,
    struct_member,
    struct_decl,
    fn_call,
    fnParam,
    fnParamList,
    local_variable_decl,
    global_variable_decl,
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
