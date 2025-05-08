// deno-lint-ignore-file no-explicit-any
import type { Parser } from "../Parser.ts";
import { kind, opt, or, repeat, seq } from "../ParserCombinator.ts";
import { tracing } from "../ParserTracing.ts";
import type { Stream, TypedToken } from "../Stream.ts";
import { RegexMatchers } from "../stream/MatchersStream.ts";
import { matchOneOf } from "../stream/RegexHelpers.ts";

export type CalcKind = "number" | "ws" | "mulDiv" | "plusMinus" | "symbol";
export const calcMatcher = new RegexMatchers<CalcKind>({
  number: /\d+/,
  ws: /\s+/,
  mulDiv: matchOneOf("* /"),
  plusMinus: matchOneOf("+ -"),
  symbol: matchOneOf("( ) ^"),
});

export const num = kind("number"); // prettier-ignore
export const plusMinus = kind("plusMinus"); // prettier-ignore
export const mulDiv = kind("mulDiv"); // prettier-ignore
export type CalcStream = Stream<TypedToken<CalcKind>>;
let expr: Parser<CalcStream, any> = null as any; // help TS with forward reference

/* from: https://en.wikipedia.org/wiki/Parsing_expression_grammar#Example
    Expr    ← Sum
    Sum     ← Product (('+' / '-') Product)*
    Product ← Power (('*' / '/') Power)*
    Power   ← Value ('^' Power)?
    Value   ← [0-9]+ / '(' Expr ')'
*/

const value = or(num, seq("(", expr, ")")); // prettier-ignore
const power: any = seq(value, opt(seq("^", () => power))); // prettier-ignore
const product = seq(power, repeat(seq(mulDiv, power))); // prettier-ignore
const sum = seq(product, repeat(seq(plusMinus, product))); // prettier-ignore
/* */ expr = sum; // prettier-ignore

export const statement = repeat(expr);

if (tracing) {
  const names: Record<string, Parser<any, unknown>> = {
    value,
    power,
    product,
    sum,
    expr,
  };

  Object.entries(names).forEach(([name, parser]) => {
    parser.setTraceName(name);
  });
}
