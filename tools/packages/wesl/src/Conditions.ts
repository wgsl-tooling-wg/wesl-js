import { assertThat, assertUnreachable } from "../../mini-parse/src/Assertions";
import { ExpressionElem } from "./parse/ExpressionElem";
import { IfAttribute } from "./parse/WeslElems";

/** Maps every condition to a value. A condition being missing is an error. */
export type Conditions = Map<string, boolean>;
/** Maps some conditions to a value. Other conditions are "unknown". Used for finding all *possible* imports during pre-bundling. */
export type PartialConditions = Map<string, boolean>;

export function assertConditionsSubset(
  partialConditions: PartialConditions,
  conditions: Conditions,
) {
  for (const [key, value] of partialConditions) {
    const finalValue = conditions.get(key);
    if (finalValue !== value) {
      throw new Error(
        `Condition ${key} has a value of ${finalValue}, but partial conditions already defined it to be ${value}`,
      );
    }
  }
}

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

// TODO: Remove these

function assertConditionsDefined(
  conditions: Conditions,
  ifAttribute: IfAttribute,
) {
  const extracted: string[] = [];

  function extractConditions(expression: ExpressionElem) {
    if (expression.kind === "binary-expression") {
      extractConditions(expression.left);
      extractConditions(expression.right);
    } else if (expression.kind === "call-expression") {
      extractConditions(expression.function);
      expression.arguments.forEach(v => extractConditions(v));
    } else if (expression.kind === "component-expression") {
      extractConditions(expression.base);
      extractConditions(expression.access);
    } else if (expression.kind === "component-member-expression") {
      extractConditions(expression.base);
    } else if (expression.kind === "literal") {
    } else if (expression.kind === "parenthesized-expression") {
      extractConditions(expression.expression);
    } else if (expression.kind === "templated-ident") {
      assertThat(expression.ident.segments.length === 1);
      assertThat(
        expression.template === undefined || expression.template.length === 0,
      );
      const name = expression.ident.segments[0];
      extracted.push(name);
    } else if (expression.kind === "unary-expression") {
      extractConditions(expression.expression);
    } else {
      assertUnreachable(expression);
    }
  }
  extractConditions(ifAttribute.param.expression);

  const missing = extracted.filter(v => !conditions.has(v));
  if (missing.length > 0) {
    throw new Error(`Conditions ${missing.join(",")} have not been defined`);
  }
}

/** Evaluates the conditions. If it's unknown, it defaults to true */
export function evaluateConditionsPartial(
  conditions: Conditions,
  ifAttribute: IfAttribute,
): boolean {
  const result = evaluateExpressionPartial(
    conditions,
    ifAttribute.param.expression,
  );
  if (result.value === null) {
    return true;
  } else {
    return result.value;
  }
}

class EvaluateResult {
  private constructor(public readonly value: boolean | null) {}
  static True = new EvaluateResult(true);
  static False = new EvaluateResult(false);
  static Null = new EvaluateResult(null);

  not(): EvaluateResult {
    if (this.value === true) {
      return EvaluateResult.False;
    } else if (this.value === false) {
      return EvaluateResult.True;
    } else {
      return this;
    }
  }
  and(other: () => EvaluateResult): EvaluateResult {
    if (this.value === true) {
      return other();
    } else if (this.value === false) {
      return EvaluateResult.False;
    } else {
      // I am null
      const otherResult = other();
      if (otherResult.value === true) {
        return EvaluateResult.Null;
      } else if (otherResult.value === false) {
        return EvaluateResult.False;
      } else {
        return EvaluateResult.Null;
      }
    }
  }

  or(other: () => EvaluateResult): EvaluateResult {
    if (this.value === true) {
      return EvaluateResult.True;
    } else if (this.value === false) {
      return other();
    } else {
      // I am null
      const otherResult = other();
      if (otherResult.value === true) {
        return EvaluateResult.True;
      } else if (otherResult.value === false) {
        return EvaluateResult.Null;
      } else {
        return EvaluateResult.Null;
      }
    }
  }
}

function evaluateExpressionPartial(
  conditions: PartialConditions,
  expression: ExpressionElem,
): EvaluateResult {
  if (expression.kind == "binary-expression") {
    const operator = expression.operator.value;
    const left = evaluateExpressionPartial(conditions, expression.left);
    if (operator === "||") {
      return left.or(() =>
        evaluateExpressionPartial(conditions, expression.right),
      );
    } else if (operator === "&&") {
      return left.and(() =>
        evaluateExpressionPartial(conditions, expression.right),
      );
    } else {
      throw new Error(`Unexpected operator ${operator}`);
    }
  } else if (expression.kind == "call-expression") {
    throw new Error("Function calls are not supported in an @if()");
  } else if (expression.kind == "component-expression") {
    throw new Error("Component access is not supported in an @if()");
  } else if (expression.kind == "component-member-expression") {
    throw new Error("Component access is not supported in an @if()");
  } else if (expression.kind == "literal") {
    assertThat(expression.value === "true" || expression.value === "false");
    return expression.value === "true" ?
        EvaluateResult.True
      : EvaluateResult.False;
  } else if (expression.kind == "parenthesized-expression") {
    return evaluateExpressionPartial(conditions, expression.expression);
  } else if (expression.kind == "templated-ident") {
    assertThat(expression.ident.segments.length === 1);
    assertThat(
      expression.template === undefined || expression.template.length === 0,
    );
    const name = expression.ident.segments[0];
    const condition = conditions.get(name);
    if (condition === true) {
      return EvaluateResult.True;
    } else if (condition === false) {
      return EvaluateResult.False;
    } else {
      return EvaluateResult.Null;
    }
  } else if (expression.kind == "unary-expression") {
    assertThat(expression.operator.value === "!");
    return evaluateExpressionPartial(conditions, expression.expression).not();
  } else {
    assertUnreachable(expression);
  }
}
