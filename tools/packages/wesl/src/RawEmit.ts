import { AttributeElem, TypeTemplateParameter } from "./parse/WeslElems.ts";
import { assertUnreachable } from "./Assertions.ts";
import {
  diagnosticControlToString,
  expressionToString,
} from "./LowerAndEmit.ts";

// TODO: Completely remove this

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
