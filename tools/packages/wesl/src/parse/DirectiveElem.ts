import { Span } from "mini-parse";
import { AttributeElem, NameElem, Transform } from "./WeslElems.ts";

export interface DirectiveElem<T extends Transform> {
  kind: "directive";
  attributes: AttributeElem<T>[];
  directive: DiagnosticDirective | EnableDirective | RequiresDirective;
  span: Span;
}

export interface DiagnosticDirective {
  kind: "diagnostic";
  severity: NameElem;
  rule: [NameElem, NameElem | null];
}
export interface EnableDirective {
  kind: "enable";
  extensions: NameElem[];
}
export interface RequiresDirective {
  kind: "requires";
  extensions: NameElem[];
}
