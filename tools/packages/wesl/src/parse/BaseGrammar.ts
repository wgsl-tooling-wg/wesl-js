import {
  or,
  Parser,
  repeatPlus,
  seq,
  Stream,
  terminated,
  token,
  tokenKind,
  withSep,
} from "mini-parse";
import { WeslToken } from "./WeslStream.ts";
import { FullIdent, NameElem, Transform } from "./WeslElems.ts";

export const name = tokenKind("word").map(makeName);
export const symbol = (symbol: string) => token("symbol", symbol);

const full_ident_continue = withSep(symbol("::"), tokenKind("word"), {
  requireOne: true,
  trailing: false,
});
export const full_ident: WeslParser<FullIdent> = or(
  seq(terminated(token("keyword", "package"), "::"), full_ident_continue).map(
    ([a, b]) => [a, ...b],
  ),
  seq(
    repeatPlus(terminated(token("keyword", "super"), "::")),
    full_ident_continue,
  ).map(([a, b]) => [...a, ...b]),
  full_ident_continue,
).map(makeFullIdent);

export type WeslParser<T> = Parser<Stream<WeslToken>, T>;

function makeName(token: WeslToken<"word">): NameElem {
  return {
    kind: "name",
    name: token.text,
    span: token.span,
  };
}

function makeFullIdent(
  tokens: (WeslToken<"keyword"> | WeslToken<"word">)[],
): FullIdent {
  return {
    segments: tokens.map(v => v.text),
    span: [tokens[0].span[0], tokens[tokens.length - 1].span[1]],
  };
}

export interface PT extends Transform {
  symbolRef: null;
}
