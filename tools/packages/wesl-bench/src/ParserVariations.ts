import { _linkSync, parsedRegistry, parseIntoRegistry, WeslStream } from "wesl";
import { WgslReflect } from "wgsl_reflect";
import type { WeslSource } from "./LoadExamples.ts";

export type ParserVariant = "link" | "parse" | "tokenize" | "wgsl-reflect";

/** WESL imports interface for creating parser variations */
export interface WeslImports {
  _linkSync: typeof _linkSync;
  parsedRegistry: typeof parsedRegistry;
  parseIntoRegistry: typeof parseIntoRegistry;
  WeslStream: typeof WeslStream;
}

/** Create a benchmark function for the specified variant */
export function parserVariation(variant: ParserVariant) {
  const imports: WeslImports = {
    _linkSync,
    parsedRegistry,
    parseIntoRegistry,
    WeslStream,
  };
  return parserVariationWithImports(variant, imports);
}

/** Create a benchmark function with custom imports */
export function parserVariationWithImports(
  variant: ParserVariant,
  imports: WeslImports,
) {
  switch (variant) {
    case "link":
      return createLinkFunction(imports);
    case "parse":
      return createParseFunction(imports);
    case "tokenize":
      return createTokenizeFunction(imports);
    case "wgsl-reflect":
      return createWgslReflectFunction();
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}

/** Create benchmark function for full linking */
export function createLinkFunction(imports: WeslImports) {
  const { _linkSync } = imports;
  return (source: WeslSource) => {
    const { weslSrc, rootModule } = source;
    _linkSync({ weslSrc, rootModuleName: rootModule });
  };
}

/** Create benchmark function for parsing only */
export function createParseFunction(imports: WeslImports) {
  const { parsedRegistry, parseIntoRegistry } = imports;
  return (source: WeslSource) => {
    const { weslSrc } = source;
    const registry = parsedRegistry();
    parseIntoRegistry(weslSrc, registry, "package");
    return registry;
  };
}

/** Create benchmark function for tokenization only */
export function createTokenizeFunction(imports: WeslImports) {
  const { WeslStream } = imports;
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

/** Create benchmark function for WgslReflect parsing */
export function createWgslReflectFunction() {
  return (source: WeslSource) => {
    const { weslSrc } = source;
    const allText = Object.values(weslSrc).join("\n");
    return new WgslReflect(allText);
  };
}
