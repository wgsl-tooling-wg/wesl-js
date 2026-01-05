import type {
  TypeRefElem,
  TypeTemplateParameter,
} from "../../AbstractElems.ts";
import type { WeslStream } from "../WeslStream.ts";
import { beginElem, finishElem } from "./ContentsHelpers.ts";
import { parseExpression } from "./ParseExpression.ts";
import { parseModulePath } from "./ParseIdent.ts";
import { makeRefIdentElem, throwParseError } from "./ParseUtil.ts";
import type { ParsingContext } from "./ParsingContext.ts";

/**
 * Grammar: type_specifier : template_elaborated_ident
 * Grammar: template_elaborated_ident : ident template_list?
 * WESL extension: qualified names with :: (e.g., pkg::Type)
 */
export function parseSimpleTypeRef(ctx: ParsingContext): TypeRefElem | null {
  const path = parseModulePath(ctx.stream);
  if (!path) return null;

  const { parts, start, end: nameEnd } = path;
  const refIdent = ctx.createRefIdent(parts.join("::"));

  beginElem(ctx, "type");

  const refIdentElem = makeRefIdentElem(ctx, refIdent, start, nameEnd);
  ctx.saveIdent(refIdent);
  ctx.addElem(refIdentElem);

  const templateParams = ctx.stream.nextTemplateStartToken()
    ? parseTemplateParams(ctx)
    : undefined;

  return finishElem("type", start, ctx, { name: refIdent, templateParams });
}

/** Parse comma-separated template parameters until closing '>'. */
export function parseTemplateParams(
  ctx: ParsingContext,
): TypeTemplateParameter[] {
  const { stream } = ctx;

  // Handle empty template <>
  if (consumeTemplateEnd(stream)) return [];

  // Parse comma-separated params
  const params: TypeTemplateParameter[] = [parseTemplateParam(ctx)];
  while (stream.matchText(",")) {
    params.push(parseTemplateParam(ctx));
  }

  // Must end with >
  if (!consumeTemplateEnd(stream))
    throwParseError(stream, "Expected '>' or ',' after template parameter");

  return params;
}

/** Consume template end token (>) if present, returning success. */
function consumeTemplateEnd(stream: WeslStream): boolean {
  if (!stream.peek()?.text.startsWith(">")) return false;
  if (!stream.nextTemplateEndToken())
    throwParseError(stream, "Expected '>' to close template parameters");
  return true;
}

/** Grammar: template_arg_expression : expression */
function parseTemplateParam(ctx: ParsingContext): TypeTemplateParameter {
  // parseExpression handles template_elaborated_ident via parsePrimaryExpr
  // inTemplate prevents '>' from being parsed as comparison operator
  const expr = parseExpression(ctx, { inTemplate: true });
  if (expr) return expr;
  throwParseError(ctx.stream, "Expected expression in template parameters");
}
