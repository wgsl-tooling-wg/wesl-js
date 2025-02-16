import { srcLog } from "mini-parse";
import {
  AbstractElem,
  ContainerElem,
  DeclIdentElem,
  RefIdentElem,
  TerminalElem,
} from "./AbstractElems.ts";

export function visitAst(
  elem: AbstractElem,
  visitor: (elem: AbstractElem) => void,
) {
  visitor(elem);
  if ((elem as ContainerElem).contents) {
    const container = elem as ContainerElem;
    container.contents.forEach(child => visitAst(child, visitor));
  }
}

export function identElemLog(
  identElem: DeclIdentElem | RefIdentElem,
  ...messages: any[]
): void {
  srcLog(
    identElem.srcModule.src,
    [identElem.start, identElem.end],
    ...messages,
  );
}
