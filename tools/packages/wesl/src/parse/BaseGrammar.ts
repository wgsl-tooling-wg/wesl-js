import { kind, tokenKind, withSepPlus } from "mini-parse";
import { WeslToken, WeslTokenKind } from "./WeslStream";
import { IdentElem, NameElem } from "../AbstractElems";

export const word = kind<WeslTokenKind>("word");
export const number = kind<WeslTokenKind>("number");

export const name = tokenKind("word").map(makeName);
export const ident = tokenKind("word").map(makeIdent);
export const qualified_ident = withSepPlus("::", ident);

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
