import { srcLog } from "mini-parse";
import { DeclIdentElem, RefIdentElem } from "./parse/WeslElems";

export function identElemLog(
  identElem: DeclIdentElem | RefIdentElem,
  ...messages: any[]
): void {
  srcLog(identElem.srcModule.src, identElem.span, ...messages);
}
