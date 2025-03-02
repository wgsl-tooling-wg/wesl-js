import { assertThat, assertUnreachable } from "../../mini-parse/src/Assertions";
import { ExpressionElem } from "./parse/ExpressionElem";
import { IfAttribute } from "./parse/WeslElems";

/** Maps every condition to a value. A condition being missing is an error. */
export type Conditions = Map<string, boolean>;

export function evaluateConditions(
  conditions: Conditions,
  ifAttribute: IfAttribute,
): boolean {
  return evaluateExpression(conditions, ifAttribute.param.expression);
}

function evaluateExpression(
  conditions: Conditions,
  expression: ExpressionElem,
): boolean {
  if (expression.kind == "binary-expression") {
    const operator = expression.operator.value;
    assertThat(operator === "||" || operator === "&&");
    const left = evaluateExpression(conditions, expression.left);
    if (left && operator === "||") {
      return true;
    } else if (!left && operator === "||") {
      return evaluateExpression(conditions, expression.right);
    } else if (left && operator === "&&") {
      return evaluateExpression(conditions, expression.right);
    } else if (!left && operator === "&&") {
      return false;
    } else {
      assertUnreachable(operator as never);
    }
  } else if (expression.kind == "call-expression") {
    throw new Error("Function calls are not supported in an @if()");
  } else if (expression.kind == "component-expression") {
    throw new Error("Component access is not supported in an @if()");
  } else if (expression.kind == "component-member-expression") {
    throw new Error("Component access is not supported in an @if()");
  } else if (expression.kind == "literal") {
    assertThat(expression.value === "true" || expression.value === "false");
    return expression.value === "true" ? true : false;
  } else if (expression.kind == "parenthesized-expression") {
    return evaluateExpression(conditions, expression.expression);
  } else if (expression.kind == "templated-ident") {
    assertThat(expression.ident.segments.length === 1);
    assertThat(
      expression.template === undefined || expression.template.length === 0,
    );
    const name = expression.ident.segments[0];
    const condition = conditions.get(name);
    if (condition === undefined) {
      throw new Error(`Condition ${name} has not been defined`);
    }
    return condition;
  } else if (expression.kind == "unary-expression") {
    assertThat(expression.operator.value === "!");
    return !evaluateExpression(conditions, expression.expression);
  } else {
    assertUnreachable(expression);
  }
}
