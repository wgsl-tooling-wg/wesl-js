import { _linkSync, parsedRegistry, parseIntoRegistry, WeslStream } from "wesl";
import { WgslReflect } from "wgsl_reflect";
import { srcToText, tokenize } from "./BenchUtils.ts";
import type { WeslSource } from "./LoadExamples.ts";

export type ParserVariant = "link" | "parse" | "tokenize" | "wgsl-reflect";

/** WESL imports for creating parser variations */
export interface WeslImports {
  _linkSync: typeof _linkSync;
  parsedRegistry: typeof parsedRegistry;
  parseIntoRegistry: typeof parseIntoRegistry;
  WeslStream: typeof WeslStream;
}

/** @return benchmark function for the specified variant */
export function parserVariation(variant: ParserVariant) {
  return makeVariation(variant, {
    _linkSync,
    parsedRegistry,
    parseIntoRegistry,
    WeslStream,
  });
}

/** @return benchmark function with custom imports */
export function makeVariation(variant: ParserVariant, imports: WeslImports) {
  const { _linkSync, parsedRegistry, parseIntoRegistry, WeslStream } = imports;

  switch (variant) {
    case "link":
      return (source: WeslSource) => {
        const { weslSrc, rootModule } = source;
        return _linkSync({ weslSrc, rootModuleName: rootModule });
      };
    case "parse":
      return (source: WeslSource) => {
        const { weslSrc } = source;
        const registry = parsedRegistry();
        parseIntoRegistry(weslSrc, registry, "package");
        return registry;
      };
    case "tokenize":
      return (source: WeslSource) =>
        tokenize(srcToText(source.weslSrc), WeslStream);
    case "wgsl-reflect":
      return (source: WeslSource) => new WgslReflect(srcToText(source.weslSrc));
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}
