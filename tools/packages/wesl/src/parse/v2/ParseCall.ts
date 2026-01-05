import type {
  ExpressionElem,
  FunctionCallExpression,
  TypeTemplateParameter,
} from "../../AbstractElems.ts";
import type { WeslStream } from "../WeslStream.ts";
import { makeCallExpression } from "./ExpressionUtil.ts";
import { parseTemplateParams } from "./ParseType.ts";
import { throwParseError } from "./ParseUtil.ts";
import type { ParsingContext } from "./ParsingContext.ts";

type ExprParser = (ctx: ParsingContext) => ExpressionElem | null;

/**
 * Parse a call suffix: optional template args + arguments.
 * Grammar: call_phrase : template_elaborated_ident argument_expression_list
 */
export function parseCallSuffix(
  ctx: ParsingContext,
  current: ExpressionElem,
  parseExpr: ExprParser,
): FunctionCallExpression | null {
  // RefIdentElem for bare idents (foo), TypeRefElem for templated (foo<T>)
  if (current.kind !== "ref" && current.kind !== "type") return null;

  const { stream } = ctx;
  // TypeRefElem has templates already; RefIdentElem needs separate parsing
  const templateArgs =
    current.kind === "type"
      ? (current.templateParams ?? null)
      : parseCallTemplateArgs(ctx);

  if (!stream.matchText("(")) return null;

  const args: ExpressionElem[] = [];
  while (true) {
    const closeEnd = matchCloseParen(stream);
    if (closeEnd !== null)
      return makeCallExpression(current, templateArgs, args, closeEnd);

    const arg = parseExpr(ctx);
    if (!arg) throwParseError(stream, "Expected expression");
    args.push(arg);

    if (stream.matchText(",")) continue;

    const end = matchCloseParen(stream);
    if (end !== null)
      return makeCallExpression(current, templateArgs, args, end);
    throwParseError(stream, "Expected ',' or ')' in function arguments");
  }
}

/** Parse optional template args for a call expression. */
function parseCallTemplateArgs(
  ctx: ParsingContext,
): TypeTemplateParameter[] | null {
  const { stream } = ctx;
  const pos = stream.checkpoint();

  if (!stream.nextTemplateStartToken()) return null;

  const params = parseTemplateParams(ctx);

  // Template args must be followed by '(' for a call - backtrack if not
  if (stream.peek()?.text !== "(") {
    stream.reset(pos);
    return null;
  }
  return params;
}

/** Consume closing paren if present, returning its end position or null. */
function matchCloseParen(stream: WeslStream): number | null {
  const token = stream.matchText(")");
  return token ? token.span[1] : null;
}
