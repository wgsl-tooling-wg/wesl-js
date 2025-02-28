import { kind, or, withSepPlus } from "mini-parse";
import { WeslTokenKind } from "./WeslStream";

export const word = kind<WeslTokenKind>("word");
export const keyword = kind<WeslTokenKind>("keyword");

export const qualified_ident = withSepPlus("::", or(word, "package", "super")); // LATER consider efficiency (it's a pretty hot area of the grammar.)
export const number = kind<WeslTokenKind>("number");
