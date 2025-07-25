import type { Parser } from "../Parser.ts";
import {
  delimited,
  fn,
  opt,
  or,
  preceded,
  repeat,
  seq,
  seqObj,
} from "../ParserCombinator.ts";
import { tracing } from "../ParserTracing.ts";
import type { Stream, Token } from "../Stream.ts";
import {
  type CalcStream,
  mulDiv,
  num,
  plusMinus,
} from "./CalculatorExample.ts";

let expr: Parser<CalcStream, number> = null as any; // help TS with forward reference

/* from: https://en.wikipedia.org/wiki/Parsing_expression_grammar#Example 
    Expr    ← Sum
    Sum     ← Product (('+' / '-') Product)*
    Product ← Power (('*' / '/') Power)*
    Power   ← Value ('^' Power)?
    Value   ← [0-9]+ / '(' Expr ')'
*/

const value = or(
  num.map(r => Number.parseInt(r, 10)),
  delimited("(", () => expr, ")"),
);

export const power: Parser<CalcStream, number> = seqObj({
  base: value,
  exp: opt(
    preceded(
      "^",
      fn(() => power),
    ),
  ),
}).map(({ base, exp }) => {
  const exponent = exp ?? 1;
  const result = base ** exponent;
  return result;
});

export const product = seqObj({
  pow: power,
  mulDiv: repeat(seq(mulDiv, power)),
}).map(({ pow, mulDiv }) => {
  if (!mulDiv) return pow;
  const result = mulDiv.reduce((acc, opVal) => {
    const [op, val] = opVal;
    if (op === "*") return acc * val;
    else return acc / val;
  }, pow);
  return result;
});

export const sum = seqObj({
  left: product,
  sumOp: repeat(seq(plusMinus, product)),
}).map(({ left, sumOp }) => {
  if (!sumOp) return left;
  return sumOp.reduce((acc, opVal) => {
    const [op, val] = opVal;
    if (op === "+") return acc + val;
    else return acc - val;
  }, left);
});
/* */ expr = sum; // prettier-ignore

export const resultsStatement = expr as Parser<Stream<Token>, number>;

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
