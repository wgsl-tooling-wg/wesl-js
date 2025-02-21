import type { Span } from "mini-parse";
import type { NameElem, RefIdentElem } from "../AbstractElems";

/** Inspired by https://github.com/wgsl-tooling-wg/wesl-rs/blob/3b2434eac1b2ebda9eb8bfb25f43d8600d819872/crates/wgsl-parse/src/syntax.rs#L364 */
export type ExpressionElem =
  | Literal
  | NameElem
  | RefIdentElem
  | ParenthesizedExpression
  | ComponentExpression
  | ComponentMemberExpression
  | UnaryExpression
  | BinaryExpression
  | FunctionCallExpression;

/** A literal value in WESL source. A boolean or a number. */
export interface Literal {
  kind: "literal";
  value: string;
  span: Span;
}

/** (expr) */
export interface ParenthesizedExpression {
  kind: "parenthesized-expression";
  expression: ExpressionElem;
}
/** `foo[expr]` */
export interface ComponentExpression {
  kind: "component-expression";
  base: ExpressionElem;
  access: ExpressionElem;
}
/** `foo.member` */
export interface ComponentMemberExpression {
  kind: "component-member-expression";
  base: ExpressionElem;
  access: NameElem;
}
/** `+foo` */
export interface UnaryExpression {
  kind: "unary-expression";
  operator: UnaryOperator;
  expression: ExpressionElem;
}
/** `foo + bar` */
export interface BinaryExpression {
  kind: "binary-expression";
  operator: BinaryOperator;
  left: ExpressionElem;
  right: ExpressionElem;
}
/** `foo(arg, arg)` */
export interface FunctionCallExpression {
  kind: "call-expression";
  function: RefIdentElem;
  arguments: ExpressionElem[];
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
