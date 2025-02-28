import type { Span } from "mini-parse";
import type { NameElem, Transform, FullIdent } from "./WeslElems.ts";

/** Inspired by https://github.com/wgsl-tooling-wg/wesl-rs/blob/3b2434eac1b2ebda9eb8bfb25f43d8600d819872/crates/wgsl-parse/src/syntax.rs#L364 */
export type ExpressionElem<T extends Transform> =
  | Literal
  | TemplatedIdentElem<T>
  | ParenthesizedExpression<T>
  | ComponentExpression<T>
  | ComponentMemberExpression<T>
  | UnaryExpression<T>
  | BinaryExpression<T>
  | FunctionCallExpression<T>;

/** A literal value in WESL source. A boolean or a number. */
export interface Literal {
  kind: "literal";
  value: string;
  span: Span;
}

/** an identifier with template arguments */
export interface TemplatedIdentElem<T extends Transform> {
  kind: "templated-ident";
  symbolRef: T["symbolRef"];
  ident: FullIdent;
  template?: ExpressionElem<T>[];
  span: Span;
}

/** (expr) */
export interface ParenthesizedExpression<T extends Transform> {
  kind: "parenthesized-expression";
  expression: ExpressionElem<T>;
}
/** `foo[expr]` */
export interface ComponentExpression<T extends Transform> {
  kind: "component-expression";
  base: ExpressionElem<T>;
  access: ExpressionElem<T>;
}
/** `foo.member` */
export interface ComponentMemberExpression<T extends Transform> {
  kind: "component-member-expression";
  base: ExpressionElem<T>;
  access: NameElem;
}
/** `+foo` */
export interface UnaryExpression<T extends Transform> {
  kind: "unary-expression";
  operator: UnaryOperator;
  expression: ExpressionElem<T>;
}
/** `foo + bar` */
export interface BinaryExpression<T extends Transform> {
  kind: "binary-expression";
  operator: BinaryOperator;
  left: ExpressionElem<T>;
  right: ExpressionElem<T>;
}
/** `foo(arg, arg)` */
export interface FunctionCallExpression<T extends Transform> {
  kind: "call-expression";
  function: TemplatedIdentElem<T>;
  arguments: ExpressionElem<T>[];
}
export interface UnaryOperator {
  value: "!" | "&" | "*" | "-" | "~";
  span: Span;
}
export interface BinaryOperator {
  value:
    | ("||" | "&&" | "+" | "-" | "*" | "/" | "%" | "==")
    | ("!=" | "<" | "<=" | ">" | ">=" | "|" | "&" | "^")
    | ("<<" | ">>");
  span: Span;
}
