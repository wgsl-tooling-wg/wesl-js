import type { ModuleElem } from "../../AbstractElems.ts";
import { ParseError } from "../../ParseError.ts";
import type { WeslAST, WeslParseState } from "../../ParseWESL.ts";
import { WeslParseError } from "../../ParseWESL.ts";
import type { SrcModule } from "../../Scope.ts";
import { emptyScope } from "../../Scope.ts";
import { WeslStream } from "../WeslStream.ts";
import { beginElem, finishContents } from "./ContentsHelpers.ts";
import { parseModule } from "./ParseModule.ts";
import { ParsingContext } from "./ParsingContext.ts";

/** Parse a WESL source module into an AST. */
export function parseWeslV2(srcModule: SrcModule): WeslAST {
  const { ctx, state } = createParseState(srcModule);
  try {
    beginElem(ctx, "module");
    parseModule(ctx);
    const moduleElem = state.stable.moduleElem;
    moduleElem.contents = finishContents(ctx, 0, moduleElem.end);
    return state.stable;
  } catch (e) {
    if (e instanceof ParseError) {
      throw new WeslParseError({ cause: e, src: srcModule });
    }
    // unexpected error (bug in parser), wrap for user-friendly reporting
    const message = e instanceof Error ? e.message : String(e);
    const parseError = new ParseError(message, [0, 0]);
    throw new WeslParseError({ cause: parseError, src: srcModule });
  }
}

/** Initialize parse state: token stream, root scope, and module element. */
function createParseState(srcModule: SrcModule): {
  ctx: ParsingContext;
  state: WeslParseState;
} {
  const stream = new WeslStream(srcModule.src);
  const rootScope = emptyScope(null);
  const moduleElem: ModuleElem = {
    kind: "module",
    contents: [],
    start: 0,
    end: srcModule.src.length,
  };
  const state: WeslParseState = {
    context: { scope: rootScope, openElems: [] },
    stable: { srcModule, moduleElem, rootScope, imports: [] },
  };
  const ctx = new ParsingContext(stream, state);
  return { ctx, state };
}
