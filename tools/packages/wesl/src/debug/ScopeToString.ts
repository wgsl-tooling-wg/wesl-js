import { childScope, Ident, Scope } from "../Scope.ts";
import { attributeToString } from "./ASTtoString.ts";
import { LineWrapper } from "./LineWrapper.ts";

/** A debugging print of the scope tree with identifiers in nested brackets */
export function scopeToString(
  scope: Scope,
  indent = 0,
  shortIdents = true,
): string {
  const { contents, kind, ifAttribute } = scope;

  const str = new LineWrapper(indent);
  const attrStrings = ifAttribute && attributeToString(ifAttribute);
  if (attrStrings) str.add(attrStrings + " ");
  if (kind === "partial") str.add("-");
  str.add("{ ");

  const last = contents.length - 1;
  let lastWasScope = false;
  let hasBlock = false;
  contents.forEach((elem, i) => {
    if (childScope(elem)) {
      const childScope: Scope = elem;
      const childBlock = scopeToString(childScope, indent + 2, shortIdents);
      !lastWasScope && str.nl();
      str.addBlock(childBlock);
      lastWasScope = true;
      hasBlock = true;
    } else {
      lastWasScope && str.add("  ");
      lastWasScope = false;
      const ident: Ident = elem;
      if (shortIdents) {
        str.add(identShortString(ident));
      } else {
        str.add(identToString(ident));
      }
      if (i < last) str.add(" ");
    }
  });

  if (!hasBlock && str.oneLine) {
    str.add(" }");
  } else {
    if (hasBlock && !lastWasScope) str.nl();
    str.add("}");
  }

  str.add(` #${scope.id}`);

  return str.result;
}

/** A debug print of the scope tree with identifiers in long form in nested brackets */
export function scopeToStringLong(scope: Scope): string {
  return scopeToString(scope, 0, false);
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
