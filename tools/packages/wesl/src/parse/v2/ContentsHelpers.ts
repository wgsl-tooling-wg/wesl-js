import type {
  ContainerElem,
  ElemKindMap,
  GrammarElem,
  TextElem,
} from "../../AbstractElems.ts";
import type { SrcModule } from "../../Scope.ts";
import type { ParsingContext } from "./ParsingContext.ts";

/** Push partial element onto stack for content collection. */
export function beginElem(
  ctx: ParsingContext,
  kind: ContainerElem["kind"],
  contents: readonly GrammarElem[] = [],
): void {
  ctx.state.context.openElems.push({ kind, contents: [...contents] });
}

/** Pop element from stack, fill gaps with TextElems, return contents. */
export function finishContents(
  ctx: ParsingContext,
  start: number,
  end: number,
): GrammarElem[] {
  const open = ctx.state.context.openElems.pop();
  if (!open) throw new Error("No open element to close");
  return coverWithText(ctx, open.contents as GrammarElem[], start, end);
}

/** Finish element: get end position, close contents, return complete element. */
export function finishElem<K extends keyof ElemKindMap>(
  kind: K,
  start: number,
  ctx: ParsingContext,
  params: Omit<ElemKindMap[K], "kind" | "start" | "end" | "contents">,
): ElemKindMap[K] {
  const end = ctx.stream.checkpoint();
  const contents = finishContents(ctx, start, end);
  return { kind, start, end, contents, ...params } as ElemKindMap[K];
}

/** Create a TextElem */
export function makeText(
  srcModule: SrcModule,
  start: number,
  end: number,
): TextElem {
  return { kind: "text", start, end, srcModule };
}

/** Fill gaps between child elements with TextElems. */
function coverWithText(
  ctx: ParsingContext,
  contents: GrammarElem[],
  start: number,
  end: number,
): GrammarElem[] {
  const { srcModule } = ctx.state.stable;
  const sorted = contents.slice().sort((a, b) => a.start - b.start);
  const elems: GrammarElem[] = [];
  let pos = start;

  for (const elem of sorted) {
    if (pos < elem.start) elems.push(makeText(srcModule, pos, elem.start));
    elems.push(elem);
    pos = elem.end;
  }
  if (pos < end) elems.push(makeText(srcModule, pos, end));
  return elems;
}
