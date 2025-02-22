import {
  AttributeElem,
  NameElem,
  StuffElem,
  TranslateTimeExpressionElem,
  TypeRefElem,
  TypeTemplateParameter,
} from "./AbstractElems.ts";
import { assertUnreachable } from "./Assertions.ts";
import {
  diagnosticControlToString,
  expressionToString,
  findDecl,
} from "./LowerAndEmit.ts";
import { RefIdent } from "./Scope.ts";

// LATER DRY emitting elements like this with LowerAndEmit?

export function attributeToString(e: AttributeElem): string {
  const { kind } = e.attribute;
  // LATER emit more precise source map info by making use of all the spans
  // Like the first case does
  if (kind === "attribute") {
    const { params } = e.attribute;
    if (params === undefined || params.length === 0) {
      return "@" + e.attribute.name;
    } else {
      return `@${e.attribute.name}(${params
        .map(param => expressionToString(param))
        .join(", ")})`;
    }
  } else if (kind === "@builtin") {
    return "@builtin(" + e.attribute.param.name + ")";
  } else if (kind === "@diagnostic") {
    return (
      "@diagnostic" +
      diagnosticControlToString(e.attribute.severity, e.attribute.rule)
    );
  } else if (kind === "@if") {
    return `@if(${expressionToString(e.attribute.param.expression)})`;
  } else if (kind === "@interpolate") {
    return `@interpolate(${e.attribute.params.map(v => v.name).join(", ")})`;
  } else {
    assertUnreachable(kind);
  }
}

export function typeListToString(params: TypeTemplateParameter[]): string {
  return `<${params.map(expressionToString).join(", ")}>`;
}

function refToString(ref: RefIdent | string): string {
  if (typeof ref === "string") return ref;
  if (ref.std) return ref.originalName;
  const decl = findDecl(ref);
  return decl.mangledName || decl.originalName;
}

export function contentsToString(elem: NameElem | StuffElem): string {
  if (elem.kind === "stuff") {
    const parts = elem.contents.map(c => {
      const { kind } = c;
      if (kind === "text") {
        return c.text;
      } else if (kind === "ref") {
        return refToString(c.ident);
      } else {
        return `?${c.kind}?`;
      }
    });
    return parts.join(" ");
  } else if (elem.kind === "name") {
    return elem.name;
  } else {
    assertUnreachable(elem);
  }
}
