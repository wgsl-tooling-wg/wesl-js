import {
  delimited,
  eof,
  fn,
  opt,
  or,
  ParseError,
  Parser,
  preceded,
  repeat,
  repeatPlus,
  req,
  separated_pair,
  seq,
  seqObj,
  Span,
  span,
  Stream,
  terminated,
  text,
  token,
  tokenKind,
  tokenOf,
  tracing,
  withSep,
  withSepPlus,
} from "mini-parse";
import {
  AliasElem,
  AssignmentOperator,
  AssignmentStatement,
  Attribute,
  AttributeElem,
  BreakIfStatement,
  BreakStatement,
  BuiltinAttribute,
  CompoundStatement,
  ConstAssertElem,
  ContinueStatement,
  ContinuingStatement,
  DeclarationElem,
  DeclarationVariant,
  DefaultCaseSelector,
  DiagnosticAttribute,
  DiscardStatement,
  ExpressionCaseSelector,
  ForStatement,
  FunctionCallStatement,
  FunctionDeclarationElem,
  FunctionParam,
  GlobalDeclarationElem,
  IdentElem,
  IfAttribute,
  IfClause,
  IfStatement,
  InterpolateAttribute,
  LhsDiscard,
  LhsExpression,
  LoopStatement,
  ModuleElem,
  NameElem,
  PostfixOperator,
  PostfixStatement,
  ReturnStatement,
  StandardAttribute,
  Statement,
  StructElem,
  StructMemberElem,
  SwitchCaseSelector,
  SwitchClause,
  SwitchStatement,
  TranslateTimeExpressionElem,
  WhileStatement,
} from "../AbstractElems.ts";
import { import_statement } from "./ImportGrammar.ts";
import { name, ident, WeslParser, symbol, PT } from "./BaseGrammar.ts";
import {
  argument_expression_list,
  attribute_if_expression,
  expression,
  lhs_expression,
  opt_template_list,
  templated_ident,
} from "./ExpressionGrammar.ts";
import { weslExtension, WeslToken } from "./WeslStream.ts";
import {
  DiagnosticDirective,
  DirectiveElem,
  EnableDirective,
  RequiresDirective,
} from "./DirectiveElem.ts";
import { ExpressionElem, TemplatedIdentElem } from "./ExpressionElem.ts";
import { ImportElem } from "./ImportElems.ts";
import { assertThat } from "../../../mini-parse/src/Assertions.ts";

const diagnostic_rule_name = seq(name, opt(preceded(".", req(name))));
const diagnostic_control = delimited(
  "(",
  separated_pair(name, ",", diagnostic_rule_name),
  seq(opt(","), ")"),
);

/** list of words that aren't identifiers (e.g. for @interpolate) */
const name_list = withSep(",", name, { requireOne: true });

const attribute: WeslParser<AttributeElem> = preceded(
  "@",
  or(
    // These attributes have no arguments
    or("compute", "const", "fragment", "invariant", "must_use", "vertex").map(
      name => makeStandardAttribute([name, []]),
    ),
    // These attributes have arguments, but the argument doesn't have any identifiers
    preceded("interpolate", req(delimited("(", name_list, ")"))).map(
      makeInterpolateAttribute,
    ),
    preceded("builtin", req(delimited("(", name, ")"))).map(
      makeBuiltinAttribute,
    ),
    preceded("diagnostic", req(diagnostic_control)).map(
      makeDiagnosticAttribute,
    ),
    preceded(
      weslExtension("if"),
      delimited(
        "(",
        fn(() => attribute_if_expression),
        seq(opt(","), ")"),
      ).mapSpanned(makeTranslateTimeExpressionElem),
    ).map(makeIfAttribute),
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
      ),
      req(() => attribute_argument_list),
    ).map(makeStandardAttribute),
    // Everything else is also a normal attribute, it might have an expression list
    seq(
      req(tokenKind("word").map(v => v.text)),
      opt(() => attribute_argument_list).map(v => v ?? []),
    ).map(makeStandardAttribute),
  ),
).mapSpanned(makeAttributeElem);

const attribute_argument_list = delimited(
  "(",
  withSep(",", expression),
  req(")"),
);

const opt_attributes = repeat(attribute);

const optionally_typed_ident: WeslParser<
  [IdentElem<PT>, TemplatedIdentElem<PT> | null]
> = seq(ident, opt(preceded(":", templated_ident)));

const lhs_discard: WeslParser<LhsDiscard> = symbol("_").map(v => ({
  kind: "discard-expression",
  span: v.span,
}));

const variable_updating_statement: WeslParser<
  AssignmentStatement<PT> | PostfixStatement<PT>
> = or(
  seq(
    lhs_expression,
    or(
      seq(
        assignmentOperator([
          ...(["=", "<<=", ">>=", "%=", "&="] as const),
          ...(["*=", "+=", "-=", "/=", "^=", "|="] as const),
        ]),
        expression,
      ),
      postfixOperator(["++", "--"]),
    ),
  ).mapSpanned(makeVariableUpdatingStatement),
  seq(lhs_discard, assignmentOperator("="), expression).mapSpanned(
    makeVariableDiscardStatement,
  ),
);

const struct_member = seqObj({
  attributes: opt_attributes,
  name: name,
  _1: ":",
  typeRef: req(templated_ident),
}).map(makeStructMember);

const struct_decl = preceded(
  "struct",
  seq(
    req(ident),
    delimited(req("{"), withSepPlus(",", struct_member), req("}")),
  ),
).mapSpanned(makeStruct);

/** Also covers func_call_statement.post.ident */
const fn_call: WeslParser<FunctionCallStatement> = seq(
  templated_ident,
  argument_expression_list,
).mapSpanned(makeFunctionCall);

/**
 * Covers variable_or_value_statement, variable_decl, global_variable_decl, global_value_decl.
 * Does not include a semicolon.
 */
const declaration: WeslParser<DeclarationElem<PT>> = seqObj({
  variant: tokenOf("keyword", ["const", "var", "override", "let"]),
  varTemplate: () => opt_template_list,
  typedIdent: req(optionally_typed_ident),
  initializer: opt(preceded("=", expression)),
}).mapSpanned(makeDeclarationElem);

/** Does not include the semicolon */
const const_assert = preceded(
  token("keyword", "const_assert"),
  req(expression),
).mapSpanned(
  (expression, span): ConstAssertElem => ({ kind: "assert", expression, span }),
);

const compound_statement: WeslParser<CompoundStatement<PT>> = delimited(
  text("{"),
  fn(() => statements),
  req("}"),
).mapSpanned(makeCompoundStatement);

const for_init: WeslParser<Statement<PT>> = or(
  fn_call,
  declaration,
  variable_updating_statement,
);

const for_update: WeslParser<Statement<PT>> = or(
  fn_call,
  variable_updating_statement,
);

const for_statement = preceded(
  "for",
  seq(
    delimited(
      "(",
      seq(
        terminated(opt(for_init), req(";")),
        terminated(opt(expression), req(";")),
        opt(for_update),
      ),
      req(")"),
    ),
    compound_statement,
  ),
).mapSpanned(makeForStatement);

const if_statement: WeslParser<IfStatement<PT>> = preceded(
  token("keyword", "if"),
  req(
    seqObj({
      ifBranch: req(seq(expression, compound_statement)),
      elseIfBranch: repeat(
        preceded(seq("else", "if"), req(seq(expression, compound_statement))),
      ),
      elseBranch: opt(preceded("else", req(compound_statement))),
    }),
  ),
).mapSpanned(makeIfStatement);

interface CustomCompoundStatement {
  attributes: AttributeElem[];
  body: (Statement<PT> | ContinuingStatement<PT> | BreakIfStatement)[];
  span: Span;
}

const custom_compound_statement: WeslParser<CustomCompoundStatement> = seq(
  opt_attributes,
  delimited(
    text("{"),
    fn(() => statements),
    req("}"),
  ),
).mapSpanned(([attributes, body], span) => ({ attributes, body, span }));

const continuing_statement = preceded(
  "continuing",
  custom_compound_statement,
).mapSpanned(makeContinuingStatement);

const break_if_statement = preceded(seq("break", "if"), expression).mapSpanned(
  makeBreakIfStatement,
);

const loop_statement = preceded("loop", custom_compound_statement).mapSpanned(
  makeLoopStatement,
);

const case_selector: WeslParser<SwitchCaseSelector> = or(
  token("keyword", "default").map(makeDefaultCaseSelector),
  expression.map(makeExpressionCaseSelector),
);
const switch_clause = seq(
  opt_attributes,
  or(
    preceded(
      "case",
      separated_pair(
        withSep(",", case_selector, { requireOne: true }),
        opt(":"),
        compound_statement,
      ),
    ).mapSpanned(makeSwitchClause),
    separated_pair(
      token("keyword", "default").map(makeDefaultCaseSelector),
      opt(":"),
      compound_statement,
    ).mapSpanned(makeDefaultClause),
  ),
).map(attachAttributes);

const switch_statement: WeslParser<SwitchStatement<PT>> = preceded(
  "switch",
  seq(
    expression,
    opt_attributes,
    delimited("{", repeatPlus(switch_clause), "}"),
  ),
).mapSpanned(makeSwitchStatement);

const while_statement: WeslParser<WhileStatement<PT>> = preceded(
  "while",
  seq(expression, compound_statement),
).mapSpanned(makeWhileStatement);

const break_statement = token("keyword", "break").map(
  (v): BreakStatement => ({ kind: "break-statement", span: v.span }),
);
const continue_statement = token("keyword", "continue").map(
  (v): ContinueStatement => ({ kind: "continue-statement", span: v.span }),
);
const discard_statement = token("keyword", "discard").map(
  (v): DiscardStatement => ({ kind: "discard-statement", span: v.span }),
);
const return_statement = preceded(
  token("keyword", "return"),
  opt(expression),
).mapSpanned(
  (expression, span): ReturnStatement => ({
    kind: "return-statement",
    expression: expression ?? undefined,
    span,
  }),
);

const statement: WeslParser<
  Statement<PT> | ContinuingStatement<PT> | BreakIfStatement
> = seq(
  opt_attributes,
  or(
    for_statement,
    if_statement,
    loop_statement,
    switch_statement,
    while_statement,
    compound_statement,
    terminated(break_statement, ";"),
    terminated(continue_statement, ";"),
    // seq(";") is excluded, since it is parsed by the statements parser below
    terminated(const_assert, ";"),
    terminated(discard_statement, ";"),
    terminated(return_statement, ";"),
    terminated(fn_call, ";"),
    terminated(
      declaration.verifyMap(v =>
        v.variant.kind !== "override" ? { value: v } : null,
      ),
      ";",
    ),
    terminated(() => variable_updating_statement, ";"),
    // Those extra statement types are parsed here to avoid backtracking (when parsing attributes above a statement)
    continuing_statement,
    break_if_statement,
  ),
).map(attachAttributes);

const statements: WeslParser<
  (Statement<PT> | ContinuingStatement<PT> | BreakIfStatement)[]
> = preceded(repeat(";"), repeat(terminated(statement, repeat(";"))));

const function_param: WeslParser<FunctionParam<PT>> = seq(
  opt_attributes,
  ident,
  preceded(":", req(templated_ident)),
).map(([attributes, name, type]) => ({ attributes, name, type }));

const function_param_list: WeslParser<FunctionParam<PT>[]> = delimited(
  "(",
  withSep(",", function_param),
  ")",
);

const function_decl: WeslParser<FunctionDeclarationElem<PT>> = preceded(
  text("fn"),
  seq(
    req(ident),
    req(function_param_list),
    opt(preceded(symbol("->"), seq(opt_attributes, templated_ident))),
    req(compound_statement),
  ),
).mapSpanned(makeFunctionDeclarationElem);

const global_alias: WeslParser<AliasElem<PT>> = terminated(
  seqObj({
    _1: "alias",
    name: req(ident),
    _2: req("="),
    type: req(templated_ident),
  }).mapSpanned(({ name, type }, span): AliasElem<PT> => {
    return { kind: "alias", name, type, span };
  }),
  req(";"),
);

const global_directive = terminated(
  seq(
    // LATER Hoist the attributes further up for even less backtracking
    opt_attributes,
    span(
      or(
        preceded("diagnostic", diagnostic_control).map(makeDiagnosticDirective),
        preceded("enable", name_list).map(makeEnableDirective),
        preceded("requires", name_list).map(makeRequiresDirective),
      ),
    ),
  ),
  ";",
).map(([attributes, { value: directive, span }]): DirectiveElem => {
  return { kind: "directive", attributes, directive: directive, span };
});

const global_decl: WeslParser<GlobalDeclarationElem<PT>> = seq(
  opt_attributes,
  or(
    function_decl,
    terminated(
      declaration.verifyMap(v =>
        v.variant.kind !== "let" ? { value: v } : null,
      ),
      ";",
    ),
    global_alias,
    terminated(const_assert, ";"),
    struct_decl,
  ),
).map(attachAttributes<GlobalDeclarationElem<PT>>);

/** The translation_unit rule allows for stray semicolons */
const global_decls: WeslParser<GlobalDeclarationElem<PT>[]> = preceded(
  repeat(";"),
  repeat(terminated(global_decl, repeat(";"))),
);

export const weslRoot = seq(
  weslExtension(repeat(import_statement)),
  repeat(global_directive),
  global_decls,
  req(eof()),
).map(makeModule);

function makeDeclarationElem(
  value: {
    variant: WeslToken<"keyword">;
    varTemplate: ExpressionElem<PT>[] | null;
    typedIdent: [IdentElem<PT>, TemplatedIdentElem<PT> | null];
    initializer: ExpressionElem<PT> | null;
  },
  span: Span,
): DeclarationElem<PT> {
  let variant: DeclarationVariant;
  if (value.variant.text === "const") {
    // LATER: We can actually report good errors here
    if (value.varTemplate !== null) {
      throw new ParseError("const<template> is not allowed.");
    }
    if (value.initializer === null) {
      throw new ParseError("const is missing an initializer.");
    }

    variant = { kind: "const" };
  } else if (value.variant.text === "let") {
    if (value.varTemplate !== null) {
      throw new ParseError("let<template> is not allowed.");
    }
    if (value.initializer === null) {
      throw new ParseError("let is missing an initializer.");
    }

    variant = { kind: "let" };
  } else if (value.variant.text === "override") {
    if (value.varTemplate !== null) {
      throw new ParseError("override<template> is not allowed.");
    }

    variant = { kind: "override" };
  } else if (value.variant.text === "var") {
    // No checks needed
    variant = { kind: "var", template: value.varTemplate ?? undefined };
  } else {
    throw new ParseError("Unexpected variant");
  }

  return {
    kind: "declaration",
    variant,
    name: value.typedIdent[0],
    type: value.typedIdent[1] ?? undefined,
    initializer: value.initializer ?? undefined,
    span,
  };
}

function makeModule(
  value: [ImportElem[], DirectiveElem[], GlobalDeclarationElem<PT>[], true],
): ModuleElem<PT> {
  const [imports, directives, declarations] = value;
  return {
    kind: "module",
    imports,
    directives,
    declarations,
  };
}

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

function makeAttributeElem(value: Attribute, span: Span): AttributeElem {
  return {
    kind: "attribute",
    attribute: value,
    span,
  };
}

function attachAttributes<T extends { attributes?: AttributeElem[] }>([
  attributes,
  v,
]: [AttributeElem[], T]): T {
  if (attributes !== undefined && attributes.length > 0) {
    v.attributes = attributes;
  }
  return v;
}

function makeFunctionDeclarationElem(
  [name, params, ret, body]: [
    IdentElem<PT>,
    FunctionParam<PT>[],
    [AttributeElem[], TemplatedIdentElem<PT>] | null,
    CompoundStatement<PT>,
  ],
  span: Span,
): FunctionDeclarationElem<PT> {
  return {
    kind: "function",
    name,
    params,
    returnAttributes: ret?.[0],
    returnType: ret?.[1],
    body,
    span,
  };
}

function makeStruct(
  [name, members]: [IdentElem<PT>, StructMemberElem[]],
  span: Span,
): StructElem<PT> {
  return {
    kind: "struct",
    name,
    members,
    span,
  };
}

function makeStructMember(obj: {
  name: NameElem;
  typeRef: TemplatedIdentElem<PT>;
  attributes: AttributeElem[] | null;
}): StructMemberElem {
  return {
    name: obj.name,
    type: obj.typeRef,
    attributes: obj.attributes ?? undefined,
  };
}

function makeStandardAttribute([name, params]: [
  string,
  ExpressionElem<PT>[],
]): StandardAttribute {
  return {
    kind: "attribute",
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
function makeTranslateTimeExpressionElem(
  expression: ExpressionElem<PT>,
  span: Span,
): TranslateTimeExpressionElem {
  return {
    kind: "translate-time-expression",
    expression,
    span,
  };
}

function makeFunctionCall(
  [func, args]: [TemplatedIdentElem<PT>, ExpressionElem<PT>[]],
  span: Span,
): FunctionCallStatement {
  return {
    kind: "call-statement",
    function: func,
    arguments: args,
    span,
  };
}
function makeCompoundStatement(
  value: (Statement<PT> | ContinuingStatement<PT> | BreakIfStatement)[],
  span: Span,
): CompoundStatement<PT> {
  for (const statement of value) {
    if (statement.kind === "continuing-statement") {
      throw new ParseError(
        "Not allowed continue { } statement. It must be the last element of a loop { }.",
      );
    }
    if (statement.kind === "break-if-statement") {
      throw new ParseError(
        "Not allowed break if statement. It must be the last element of a continue { }.",
      );
    }
  }
  return {
    kind: "compound-statement",
    body: value as Statement<PT>[],
    span,
  };
}
function makeForStatement(
  [[initializer, condition, update], body]: [
    [Statement<PT> | null, ExpressionElem<PT> | null, Statement<PT> | null],
    CompoundStatement<PT>,
  ],
  span: Span,
): ForStatement<PT> {
  return {
    kind: "for-statement",
    span,
    initializer: initializer ?? undefined,
    condition: condition ?? undefined,
    update: update ?? undefined,
    body,
  };
}

function makeIfStatement(
  value: {
    ifBranch: [ExpressionElem<PT>, CompoundStatement<PT>];
    elseIfBranch: [ExpressionElem<PT>, CompoundStatement<PT>][];
    elseBranch: CompoundStatement<PT> | null;
  },
  span: Span,
): IfStatement<PT> {
  let main: IfClause<PT> = {
    kind: "if-clause",
    condition: value.ifBranch[0],
    accept: value.ifBranch[1],
  };
  let previous = main;
  for (const [condition, accept] of value.elseIfBranch) {
    previous.reject = {
      kind: "if-clause",
      condition,
      accept,
    };
    previous = previous.reject;
  }
  if (value.elseBranch !== null) {
    previous.reject = value.elseBranch;
  }

  return {
    kind: "if-else-statement",
    main,
    span,
  };
}

function makeDefaultCaseSelector(
  token: WeslToken<"keyword">,
): DefaultCaseSelector {
  return {
    expression: "default",
    span: token.span,
  };
}

function makeExpressionCaseSelector(
  expression: ExpressionElem<PT>,
): ExpressionCaseSelector {
  return {
    expression,
  };
}
function makeSwitchClause(
  [cases, body]: [SwitchCaseSelector[], CompoundStatement<PT>],
  span: Span,
): SwitchClause<PT> {
  return {
    cases,
    body,
    span,
  };
}
function makeDefaultClause(
  [defaultCase, body]: [DefaultCaseSelector, CompoundStatement<PT>],
  span: Span,
): SwitchClause<PT> {
  return {
    cases: [defaultCase],
    body,
    span,
  };
}
function makeSwitchStatement(
  [selector, bodyAttributes, clauses]: [
    ExpressionElem<PT>,
    AttributeElem[],
    SwitchClause<PT>[],
  ],
  span: Span,
): SwitchStatement<PT> {
  return {
    kind: "switch-statement",
    selector,
    bodyAttributes,
    clauses,
    span,
  };
}

function assignmentOperator(
  text: AssignmentOperator["value"] | AssignmentOperator["value"][],
): WeslParser<AssignmentOperator> {
  return (
    Array.isArray(text) ?
      tokenOf("symbol", text)
    : token("symbol", text)).map(token => ({
    value: token.text as any,
    span: token.span,
  }));
}

function makeVariableUpdatingStatement(
  value: [
    LhsExpression<PT>,
    [AssignmentOperator, ExpressionElem<PT>] | PostfixOperator,
  ],
  span: Span,
): AssignmentStatement<PT> | PostfixStatement<PT> {
  if (Array.isArray(value[1])) {
    return {
      kind: "assignment-statement",
      left: value[0],
      operator: value[1][0],
      right: value[1][1],
      span,
    };
  } else {
    return {
      kind: "postfix-statement",
      expression: value[0],
      operator: value[1],
      span,
    };
  }
}
function postfixOperator(
  text: PostfixOperator["value"] | PostfixOperator["value"][],
): WeslParser<PostfixOperator> {
  return (
    Array.isArray(text) ?
      tokenOf("symbol", text)
    : token("symbol", text)).map(token => ({
    value: token.text as any,
    span: token.span,
  }));
}

function makeVariableDiscardStatement(
  [left, operator, right]: [LhsDiscard, AssignmentOperator, ExpressionElem<PT>],
  span: Span,
): AssignmentStatement<PT> {
  return {
    kind: "assignment-statement",
    left,
    operator,
    right,
    span,
  };
}

function makeContinuingStatement(
  compound: CustomCompoundStatement,
  span: Span,
): ContinuingStatement<PT> {
  const breakIf =
    compound.body.at(-1)?.kind === "break-if-statement" ?
      (compound.body.pop() as BreakIfStatement)
    : undefined;
  const body = makeCompoundStatement(compound.body, compound.span);
  body.attributes = compound.attributes;
  return {
    kind: "continuing-statement",
    body,
    breakIf,
    span,
  };
}
function makeBreakIfStatement(
  expression: ExpressionElem<PT>,
  span: Span,
): BreakIfStatement {
  return { kind: "break-if-statement", expression, span };
}

function makeLoopStatement(
  compound: CustomCompoundStatement,
  span: Span,
): LoopStatement<PT> {
  const continuing =
    compound.body.at(-1)?.kind === "continuing-statement" ?
      (compound.body.pop() as ContinuingStatement<PT>)
    : undefined;
  const body = makeCompoundStatement(compound.body, compound.span);
  body.attributes = compound.attributes;
  return {
    kind: "loop-statement",
    body,
    continuing,
    span,
  };
}
function makeWhileStatement(
  [condition, body]: [ExpressionElem<PT>, CompoundStatement<PT>],
  span: Span,
): WhileStatement<PT> {
  return {
    kind: "while-statement",
    condition,
    body,
    span,
  };
}

if (tracing) {
  const names: Record<string, Parser<Stream<WeslToken>, unknown>> = {
    diagnostic_rule_name,
    diagnostic_control,
    name_list,
    attribute,
    attribute_argument_list,
    opt_attributes,
    optionally_typed_ident,
    lhs_discard,
    variable_updating_statement,
    struct_member,
    struct_decl,
    fn_call,
    declaration,
    const_assert,
    compound_statement,
    for_init,
    for_update,
    for_statement,
    if_statement,
    custom_compound_statement,
    continuing_statement,
    break_if_statement,
    loop_statement,
    case_selector,
    switch_clause,
    switch_statement,
    while_statement,
    break_statement,
    continue_statement,
    discard_statement,
    return_statement,
    statement,
    statements,
    function_param,
    function_param_list,
    function_decl,
    global_alias,
    global_directive,
    global_decl,
    weslRoot,
  };

  Object.entries(names).forEach(([name, parser]) => {
    parser.setTraceName(name);
  });
}
