import { _linkSync, parsedRegistry, parseIntoRegistry, WeslStream } from "wesl";
import type { WeslSource } from "./LoadExamples.ts";

export type ParserVariant = "link" | "parse" | "tokenize";

/** Create a benchmark function for the specified variant */
export function parserVariation(variant: ParserVariant) {
  switch (variant) {
    case "link":
      return linkFunction();
    case "parse":
      return parseFunction();
    case "tokenize":
      return tokenizeFunction();
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}

/** Create benchmark function for full linking */
function linkFunction() {
  return (source: WeslSource) => {
    const { weslSrc, rootModule } = source;
    _linkSync({ weslSrc, rootModuleName: rootModule });
  };
}

/** Create benchmark function for parsing only */
function parseFunction() {
  return (source: WeslSource) => {
    const { weslSrc } = source;
    const registry = parsedRegistry();
    parseIntoRegistry(weslSrc, registry, "package");
    return registry;
  };
}

/** Create benchmark function for tokenization only */
function tokenizeFunction() {
  return (source: WeslSource) => {
    const { weslSrc } = source;
    const allText = Object.values(weslSrc).join("\n");
    const stream = new WeslStream(allText);
    const tokens = [];
    while (true) {
      const token = stream.nextToken();
      if (token === null) break;
      tokens.push(token);
    }
    return tokens;
  };
}
