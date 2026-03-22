import { highlightTree, tags as t, tagHighlighter } from "@lezer/highlight";
import { weslHighlighting } from "../Highlight.ts";
import { parser } from "../parser.js";

export interface StyledSpan {
  from: number;
  to: number;
  text: string;
  classes: string;
}

/** Map every tag used in Highlight.ts to a readable class name. */
const highlighter = tagHighlighter([
  { tag: t.number, class: "number" },
  { tag: t.bool, class: "bool" },
  { tag: t.lineComment, class: "lineComment" },
  { tag: t.blockComment, class: "blockComment" },
  { tag: t.keyword, class: "keyword" },
  { tag: t.controlKeyword, class: "controlKeyword" },
  { tag: t.definitionKeyword, class: "defKeyword" },
  { tag: t.variableName, class: "variableName" },
  { tag: t.typeName, class: "typeName" },
  { tag: t.function(t.variableName), class: "fnCall" },
  { tag: t.function(t.definition(t.variableName)), class: "fnDef" },
  { tag: t.definition(t.typeName), class: "typeDef" },
  { tag: t.definition(t.variableName), class: "varDef" },
  { tag: t.propertyName, class: "property" },
  { tag: t.namespace, class: "namespace" },
  { tag: t.definitionOperator, class: "assignOp" },
  { tag: t.updateOperator, class: "updateOp" },
  { tag: t.paren, class: "paren" },
  { tag: t.squareBracket, class: "bracket" },
  { tag: t.brace, class: "brace" },
  { tag: t.punctuation, class: "punctuation" },
  { tag: t.angleBracket, class: "angle" },
]);

/** Parse source with highlight configuration. */
export function parseWithHighlighting(src: string) {
  return parser.configure({ props: [weslHighlighting] }).parse(src);
}

/** Parse source and return styled spans from highlight rules. */
export function checkHighlights(src: string): StyledSpan[] {
  const tree = parseWithHighlighting(src);
  const spans: StyledSpan[] = [];
  highlightTree(tree, highlighter, (from, to, classes) => {
    spans.push({ from, to, text: src.slice(from, to), classes });
  });
  return spans;
}
