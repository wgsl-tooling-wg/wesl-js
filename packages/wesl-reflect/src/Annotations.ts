import type { AbstractElem, HasAttributes, StandardAttribute } from "wesl";

/** Find a StandardAttribute by name on an element with attributes. */
export function findAnnotation(
  elem: HasAttributes,
  name: string,
): StandardAttribute | undefined {
  for (const a of elem.attributes ?? []) {
    const attr = a.attribute;
    if (attr.kind === "@attribute" && attr.name === name) return attr;
  }
}

/** Extract string params from an annotation's UnknownExpressionElem params. */
export function annotationParams(attr: StandardAttribute): string[] {
  if (!attr.params) return [];
  return attr.params.map(expr => exprToString(expr.contents));
}

/** Find the first literal or text value in expression contents. */
function exprToString(contents: AbstractElem[]): string {
  for (const child of contents) {
    if (child.kind === "literal") return child.value;
    if (child.kind === "text")
      return child.srcModule.src.slice(child.start, child.end);
  }
  return "";
}

/** Extract numeric params from an annotation. */
export function numericParams(attr: StandardAttribute): number[] {
  return annotationParams(attr).map(Number);
}
