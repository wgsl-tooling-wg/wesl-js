import { assertUnreachable } from "../mini-parse/Assertions.ts";
import type {
  AttributeElem,
  ElemWithAttributes,
  ExpressionElem,
  IfAttribute,
} from "./AbstractElems.ts";
import { assertThat } from "./Assertions.ts";
import type { Conditions, Scope } from "./Scope.ts";
import { findMap } from "./Util.ts";

/** @return true if the element is valid under current Conditions */
export function elementValid(
  elem: ElemWithAttributes,
  conditions: Conditions,
): boolean {
  const attributes = elem.attributes;
  if (!attributes) return true;
  const ifAttr = findMap(attributes, extractIfAttribute);
  return !ifAttr || evaluateIfAttribute(ifAttr, conditions);
}

/** @return true if the scope is valid under current conditions */
export function scopeValid(scope: Scope, conditions: Conditions): boolean {
  const { ifAttribute } = scope;
  if (!ifAttribute) return true;
  const result = evaluateIfAttribute(ifAttribute, conditions); // LATER cache?
  return result;
}

/** @return return IfAttribute if AttributeElem contains an IfAttribute */
function extractIfAttribute(elem: AttributeElem): IfAttribute | undefined {
  const { attribute } = elem;
  return attribute.kind === "@if" ? attribute : undefined;
}

/** @return true if the @if attribute is valid with current Conditions */
function evaluateIfAttribute(
  ifAttribute: IfAttribute,
  conditions: Conditions,
): boolean {
  return evaluateIfExpression(ifAttribute.param.expression, conditions);
}

/** Evaluate an @if expression based on current runtime Conditions
 * @return true if the expression is true */
function evaluateIfExpression(
  expression: ExpressionElem,
  conditions: Conditions,
): boolean {
  const { kind } = expression;
  if (kind == "unary-expression") {
    assertThat(expression.operator.value === "!");
    return !evaluateIfExpression(expression.expression, conditions);
  } else if (kind == "binary-expression") {
    const op = expression.operator.value;
    assertThat(op === "||" || op === "&&");
    const leftResult = evaluateIfExpression(expression.left, conditions);
    if (op === "||") {
      return leftResult || evaluateIfExpression(expression.right, conditions);
    } else if (op === "&&") {
      return leftResult && evaluateIfExpression(expression.right, conditions);
    } else {
      assertUnreachable(op);
    }
  } else if (kind == "literal") {
    const { value } = expression;
    assertThat(value === "true" || value === "false");
    return value === "true";
  } else if (kind == "parenthesized-expression") {
    return evaluateIfExpression(expression.expression, conditions);
  } else if (kind === "translate-time-feature") {
    return conditions[expression.name];
  } else {
    throw new Error(`unexpected @if expression ${JSON.stringify(expression)}`);
  }
}
