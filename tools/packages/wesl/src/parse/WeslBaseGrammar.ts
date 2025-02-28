import { kind, or, withSepPlus } from "mini-parse";
import { WeslTokenKind } from "./WeslStream";

export const word = kind<WeslTokenKind>("word");
export const keyword = kind<WeslTokenKind>("keyword");

// or(word, keyword) is imprecise here. But package::foo::bar is a qualifed ident.. TODO consider a better fix.
export const qualified_ident = withSepPlus("::", or(word, keyword));
export const number = kind<WeslTokenKind>("number");
