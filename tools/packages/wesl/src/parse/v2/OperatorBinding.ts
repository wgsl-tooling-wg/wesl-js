/**
 * WGSL operator precedence and binding rules (WGSL spec 8.19).
 *
 * WGSL restricts how operators can combine without parentheses:
 * - Shift operators (<<, >>) cannot chain: `a << b << c` is invalid
 * - Relational operators (<, >, ==, etc.) cannot chain: `a < b < c` is invalid
 * - Bitwise operators (&, |, ^) cannot mix: `a & b | c` is invalid
 * - Logical operators (&&, ||) cannot mix: `a && b || c` is invalid
 * - Logical and bitwise cannot mix: `a & b && c` is invalid
 *
 * Valid combinations:
 * - Arithmetic chains freely: `a + b * c - d`
 * - Same bitwise chains: `a & b & c`
 * - Same logical chains: `a || b || c`
 * - Relational with logical: `a < b || c < d`
 */

import type { WeslStream, WeslToken } from "../WeslStream.ts";
import { throwParseError } from "./ParseUtil.ts";

export type OpGroup =
  | "unary"
  | "arithmetic"
  | "shift"
  | "relational"
  | "bitAnd"
  | "bitXor"
  | "bitOr"
  | "logicalAnd"
  | "logicalOr";

const binaryPrecedence: Record<string, number> = {
  "||": 1,
  "&&": 2,
  "|": 3,
  "^": 4,
  "&": 5,
  "==": 6,
  "!=": 6,
  "<": 7,
  "<=": 7,
  ">": 7,
  ">=": 7,
  "<<": 8,
  ">>": 8,
  "+": 9,
  "-": 9,
  "*": 10,
  "/": 10,
  "%": 10,
};

export function isBinaryOperator(
  token: WeslToken | null | undefined,
): token is WeslToken {
  if (!token) return false;
  return token.text in binaryPrecedence;
}

export function getPrecedence(opToken: WeslToken): number {
  return binaryPrecedence[opToken.text] || 0;
}

export function getOpGroup(op: string): OpGroup {
  switch (op) {
    case "*":
    case "/":
    case "%":
    case "+":
    case "-":
      return "arithmetic";
    case "<<":
    case ">>":
      return "shift";
    case "<":
    case ">":
    case "<=":
    case ">=":
    case "==":
    case "!=":
      return "relational";
    case "&":
      return "bitAnd";
    case "^":
      return "bitXor";
    case "|":
      return "bitOr";
    case "&&":
      return "logicalAnd";
    case "||":
      return "logicalOr";
    default:
      return "arithmetic";
  }
}

/** Validate WGSL 8.19 operator binding restrictions, return op's group. */
export function checkOpBinding(
  stream: WeslStream,
  op: string,
  leftGroup: OpGroup,
): OpGroup {
  const opGroup = getOpGroup(op);
  if (!canBindLeft(op, leftGroup))
    throwParseError(stream, `'${op}' requires parentheses after ${leftGroup}`);
  if (!canSelfChain(opGroup) && leftGroup === opGroup)
    throwParseError(stream, `'${op}' cannot be chained`);
  return opGroup;
}

/** Check if operator can have leftGroup as its left operand. */
function canBindLeft(op: string, leftGroup: OpGroup): boolean {
  const opGroup = getOpGroup(op);

  // Shift only binds unary (no chaining)
  if (opGroup === "shift") return leftGroup === "unary";

  // Bitwise operators self-chain but dont mix
  if (opGroup === "bitAnd")
    return leftGroup === "unary" || leftGroup === "bitAnd";
  if (opGroup === "bitXor")
    return leftGroup === "unary" || leftGroup === "bitXor";
  if (opGroup === "bitOr")
    return leftGroup === "unary" || leftGroup === "bitOr";

  // Logical operators don't mix with bitwise or each other
  if (opGroup === "logicalAnd")
    return !isBitwise(leftGroup) && leftGroup !== "logicalOr";
  if (opGroup === "logicalOr")
    return !isBitwise(leftGroup) && leftGroup !== "logicalAnd";

  // Arithmetic/relational bind all above
  return true;
}

/** Shift and relational operators cannot repeat (no a << b << c or a < b < c). */
function canSelfChain(group: OpGroup): boolean {
  return group !== "shift" && group !== "relational";
}

function isBitwise(g: OpGroup): boolean {
  return g === "bitAnd" || g === "bitXor" || g === "bitOr";
}
