import { kind, or, withSepPlus } from "@wesl/mini-parse";
import type { WeslTokenKind } from "./WeslStream.ts";

export const word = kind<WeslTokenKind>("word");
export const keyword = kind<WeslTokenKind>("keyword");

export const qualified_ident = withSepPlus("::", or(word, "package", "super")); // LATER consider efficiency (it's a pretty hot area of the grammar.)
export const number = kind<WeslTokenKind>("number");
