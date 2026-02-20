import type { AbstractElem } from "wesl";

/** Recursively walk wesl AST, visiting all nested elements. */
export function walkAst(
  elem: AbstractElem,
  fn: (e: AbstractElem) => void,
): void {
  fn(elem);
  switch (elem.kind) {
    case "parenthesized-expression":
    case "unary-expression":
      walkAst(elem.expression, fn);
      break;
    case "binary-expression":
      walkAst(elem.left, fn);
      walkAst(elem.right, fn);
      break;
    case "component-expression":
    case "component-member-expression":
      walkAst(elem.base, fn);
      walkAst(elem.access, fn);
      break;
    case "call-expression":
      walkAst(elem.function, fn);
      for (const arg of elem.arguments) walkAst(arg, fn);
      if (elem.templateArgs)
        for (const arg of elem.templateArgs) walkAst(arg, fn);
      break;
    case "literal":
    case "ref":
    case "decl":
    case "text":
    case "name":
    case "directive":
    case "import":
    case "synthetic":
      break;
    default: // ContainerElem types - all have contents
      for (const child of elem.contents) walkAst(child, fn);
  }
}
