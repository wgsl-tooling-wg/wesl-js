import { kind, or, withSepPlus } from "mini-parse";
import type { WeslTokenKind } from "./WeslStream";

export const word = kind<WeslTokenKind>("word");
export const keyword = kind<WeslTokenKind>("keyword");

export const qualified_ident = withSepPlus(
  "::",
  or(word, keyword, "package", "super"),
); // LATER consider efficiency (it's a pretty hot area of the grammar.)
export const number = kind<WeslTokenKind>("number");
