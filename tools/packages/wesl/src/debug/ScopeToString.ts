import { Ident, Scope } from "../Scope.ts";
import { LineWrapper } from "./LineWrapper.ts";

/** A debugging print of the scope tree with identifiers in nested brackets */
export function scopeToString(scope: Scope, indent = 0): string {
  const str = new LineWrapper(indent);
  scopeToStringInner(scope, str);
  return str.print();
}

function scopeToStringInner(scope: Scope, str: LineWrapper): void {
  str.add("{ ");

  // list of identifiers, with decls prefixed with '%'
  const identStrings = scope.idents.map(({ kind, originalName }) => {
    const prefix = kind === "decl" ? "%" : "";
    return `${prefix}${originalName}`;
  });

  const last = identStrings.length - 1;
  identStrings.forEach((s, i) => {
    const element = i < last ? s + ", " : s;
    str.add(element);
  });

  for (const child of scope.children) {
    scopeToStringInner(child, str.indentedBlock(2));
  }
  if (scope.children.length > 0) {
    str.add("\n");
    str.add("}");
  } else {
    str.add(" }");
  }
}

export function identToString(ident?: Ident): string {
  if (!ident) return JSON.stringify(ident);
  const { kind, originalName } = ident;
  const idStr = ident.id ? `#${ident.id}` : "";
  if (kind === "ref") {
    const ref = identToString(ident.refersTo!);
    return `${originalName} ${idStr} -> ${ref}`;
  } else {
    return `%${originalName} ${idStr} (${ident.mangledName})`;
  }
}
