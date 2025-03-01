import {
  AttributeElem,
  ElemWithAttributes,
  ExpressionElem,
  IfAttribute,
} from "./AbstractElems.ts";
import { assertThatDebug, assertUnreachable } from "./Assertions.ts";
import { Conditions } from "./Scope.ts";
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
    assertThatDebug(expression.operator.value === "!");
    return !evaluateIfExpression(expression.expression, conditions);
  } else if (kind == "binary-expression") {
    const op = expression.operator.value;
    assertThatDebug(op === "||" || op === "&&");
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
    assertThatDebug(value === "true" || value === "false");
    return value === "true";
  } else if (kind == "parenthesized-expression") {
    return evaluateIfExpression(expression.expression, conditions);
  } else {
    throw new Error("unexpected @if expression ${expression}");
  }
}
