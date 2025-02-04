import {
  AttributeElem,
  ContainerElem,
  ExpressionElem,
  StuffElem,
  TypeRefElem,
  TypeTemplateParameter,
} from "./AbstractElems.ts";
import { assertUnreachable } from "./Assertions.ts";
import { findDecl } from "./LowerAndEmit.ts";
import { RefIdent } from "./Scope.ts";

// LATER DRY emitting elements like this with LowerAndEmit?

export function attributeToString(attribute: AttributeElem): string {
  const params =
    attribute.params ?
      `(${attribute.params.map(contentsToString).join(", ")})`
    : "";
  return `@${attribute.name}${params}`;
}

export function typeListToString(params: TypeTemplateParameter[]): string {
  return `<${params.map(typeParamToString).join(", ")}>`;
}

export function typeParamToString(param?: TypeTemplateParameter): string {
  if (typeof param === "string") return param;
  if (param?.kind === "literal" || param?.kind === "ref") {
    return contentsToString(param);
  }

  if (param?.kind === "type") return typeRefToString(param);
  else return `?${param}?`;
}

function typeRefToString(t?: TypeRefElem): string {
  if (!t) return "?";
  const { name, templateParams } = t;
  const params = templateParams ? typeListToString(templateParams) : "";
  return `${refToString(name)}${params}`;
}

function refToString(ref: RefIdent | string): string {
  if (typeof ref === "string") return ref;
  if (ref.std) return ref.originalName;
  const decl = findDecl(ref);
  return decl.mangledName || decl.originalName;
}

export function contentsToString(elem: ExpressionElem | StuffElem): string {
  if (elem.kind === "ref") {
    return refToString(elem.ident);
  } else if (elem.kind === "literal") {
    return elem.srcModule.src.slice(elem.start, elem.end);
  } else if (elem.kind === "stuff") {
    const parts = elem.contents.map(c => {
      const { kind } = c;
      if (kind === "text") {
        return c.srcModule.src.slice(c.start, c.end);
      } else if (kind === "ref") {
        return refToString(c.ident);
      } else {
        return `?${c.kind}?`;
      }
    });
    return parts.join(" ");
  } else {
    assertUnreachable(elem);
  }
}
