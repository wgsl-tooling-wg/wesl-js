import { Parser, Stream, token, tokenKind, withSepPlus } from "mini-parse";
import { WeslToken } from "./WeslStream";
import { IdentElem, NameElem } from "../AbstractElems";

export const name = tokenKind("word").map(makeName);
export const ident = tokenKind("word").map(makeIdent);
export const qualified_ident = withSepPlus("::", ident);
export const symbol = (symbol: string) => token("symbol", symbol);

export type WeslParser<T> = Parser<Stream<WeslToken>, T>;

function makeName(token: WeslToken<"word">): NameElem {
  return {
    kind: "name",
    name: token.text,
    span: token.span,
  };
}

function makeIdent(token: WeslToken<"word">): IdentElem {
  return {
    kind: "ident",
    name: token.text,
    span: token.span,
  };
}
