/* eslint-disable */
// oxlint-disable eslint(no-unused-vars)
import { kind, or, repeat, seq } from "../ParserCombinator.js";
import { RegexMatchers } from "../stream/MatchersStream.js";
import { matchOneOf } from "../stream/RegexHelpers.js";

export type SimpleTokenKinds = "number" | "symbol" | "ws";
export const simpleTokens = new RegexMatchers<SimpleTokenKinds>({
  number: /\d+/,
  symbol: matchOneOf("( ) ^ + - * /"),
  ws: /\s+/,
});

const num = kind("number");

export const simpleSum = seq(num, or("+", "-"), num);

const int = num.map(r => Number.parseInt(r, 10));

export const sumResults = seq(int, or("+", "-"), int).map(([a, op, b]) => {
  return op === "+" ? a + b : a - b;
});

const op = or("+", "-");

export const taggedSum = seq(
  int,
  repeat(seq(op, int)), // accumulate an array of [op, int] pairs
).map(([left, opRights]) => {
  if (!opRights) return left;
  return opRights.reduce((acc, opRight) => {
    const [op, right] = opRight;
    return op === "+" ? acc + right : acc - right;
  }, left);
});

export type QuoteTokenKinds = "quote" | "nonQuote";
const _quoteTokens = new RegexMatchers<QuoteTokenKinds>({
  quote: /"/,
  nonQuote: /[^"]+/,
});

const _nonQuote = kind<QuoteTokenKinds>("nonQuote");

export type ASTElem = BinOpElem;

interface BinOpElem {
  kind: "binOp";
  left: number | BinOpElem;
  right: number | BinOpElem;
  op: "+" | "-";
}

export const sumElem = seq(int, or("+", "-"), int).map(([a, op, b]) => {
  const binOpElem: BinOpElem = {
    kind: "binOp",
    left: a,
    right: b,
    op: op as "+" | "-",
  };
  return binOpElem;
});
