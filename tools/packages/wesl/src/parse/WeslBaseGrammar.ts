import { kind, withSepPlus } from "mini-parse";
import { WeslTokenKind } from "./WeslStream";

export const word = kind<WeslTokenKind>("word");
export const qualified_ident = withSepPlus("::", word);
export const number = kind<WeslTokenKind>("number");
