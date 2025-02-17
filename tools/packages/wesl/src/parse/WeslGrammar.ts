import {
  eof,
  fn,
  kind,
  opt,
  or,
  Parser,
  repeat,
  repeatPlus,
  req,
  seq,
  Stream,
  tagScope,
  text,
  tracing,
  withSep,
  withSepPlus,
} from "mini-parse";
import { weslImports } from "./ImportGrammar.ts";
import { WeslToken } from "./WeslStream.ts";
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
  nameCollect,
  refIdent,
  scopeCollect,
  typedDecl,
  typeRefCollect,
} from "../WESLCollect.ts";
import {
  expression,
  opt_template_list,
  simple_component_reference,
  component_or_swizzle,
  argument_expression_list,
  type_specifier,
} from "./WeslExpression.ts";
import { qualified_ident, word } from "./WeslBaseGrammar.ts";

const diagnostic_rule_name = withSep(".", word, { requireOne: true });
const diagnostic_control = seq(
  "(",
  word,
  ",",
  diagnostic_rule_name,
  opt(","),
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

const opt_attributes = repeat(attribute);

/** parse an identifier into a TypeNameElem */
// prettier-ignore
export const typeNameDecl = 
  req(
    word                            .collect(declCollect, "type_name")
  );

/** parse an identifier into a TypeNameElem */
// prettier-ignore
export const fnNameDecl = 
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
export const struct_member = tagScope(
  seq(
    opt_attributes,
    word                              .collect(nameCollect, "nameElem"),
    ":",
    req(type_specifier),
  )                                   .collect(collectStructMember)
)                                     .ctag("members");

// prettier-ignore
export const struct_decl = seq(
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
export const fn_call = seq(
  qualified_ident                     .collect(refIdent),
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
export const fn_decl = seq(
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
export const global_alias = seq(
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

const global_directive = seq(
  or(
    seq("diagnostic", diagnostic_control),
    seq("enable", withSep(",", word, { requireOne: true })),
    seq("requires", withSep(",", word, { requireOne: true })),
  ),
  ";",
);

// prettier-ignore
// TODO: Hoist out the "opt_attributes"
export const global_decl = tagScope(
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
    weslImports,
    repeat(global_directive),
    repeat(global_decl),
    req(eof()),
  )                                 .collect(collectModule, "collectModule");

if (tracing) {
  const names: Record<string, Parser<Stream<WeslToken>, unknown>> = {
    qualified_ident,
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
