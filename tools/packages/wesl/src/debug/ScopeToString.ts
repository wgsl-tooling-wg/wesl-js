import { childScope, Ident, Scope } from "../Scope.ts";
import { attributeToString } from "./ASTtoString.ts";
import { LineWrapper } from "./LineWrapper.ts";

/** A debugging print of the scope tree with identifiers in nested brackets */
export function scopeToString(scope: Scope, indent = 0): string {
  const { contents, kind, ifAttributes = [] } = scope;

  const str = new LineWrapper(indent);
  const attrStrings = ifAttributes.map(a => attributeToString(a)).join(" ");
  if (attrStrings) str.add(attrStrings + " ");
  if (kind === "partial") str.add("-");
  str.add("{ ");

  const last = contents.length - 1;
  let lastWasScope = false;
  contents.forEach((elem, i) => {
    if (childScope(elem)) {
      const childScope: Scope = elem;
      const childBlock = scopeToString(childScope, indent + 2);
      !lastWasScope && str.nl();
      str.addBlock(childBlock);
      lastWasScope = true;
    } else {
      lastWasScope && str.add("  ");
      lastWasScope = false;
      const ident: Ident = elem;
      str.add(identShortString(ident));
      if (i < last) str.add(" ");
    }
  });

  if (str.oneLine) {
    str.add(" }");
  } else {
    str.add("}");
  }

  str.add(` #${scope.id}`);

  return str.result;
}

/** name of an identifier, with decls prefixed with '%' */
function identShortString(ident: Ident): string {
  const { kind, originalName } = ident;
  const prefix = kind === "decl" ? "%" : "";
  return `${prefix}${originalName}`;
}

export function identToString(ident?: Ident): string {
  if (!ident) return JSON.stringify(ident);
  const { kind, originalName } = ident;
  const idStr = ident.id ? `#${ident.id}` : "";
  if (kind === "ref") {
    const ref = identToString(ident.refersTo!);
    return `${originalName} ${idStr} -> ${ref}`;
  } else {
    const { mangledName } = ident;
    const mangled = mangledName ? `(${mangledName})` : "";
    return `%${originalName}${mangled} ${idStr} `;
  }
}
