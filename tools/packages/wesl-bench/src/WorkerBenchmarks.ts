import { _linkSync, parsedRegistry, parseIntoRegistry, WeslStream } from "wesl";
import { WgslReflect } from "wgsl_reflect";
import type { WeslSource } from "./LoadExamples.ts";
import type { ParserVariant } from "./ParserVariations.ts";

/** Parameters passed to worker benchmark functions */
export interface BenchParams {
  variant: ParserVariant;
  source: WeslSource;
}

/** Main benchmark function called by workers */
export function runBenchmark(params: BenchParams) {
  const { variant, source } = params;
  
  switch (variant) {
    case "link": {
      const { weslSrc, rootModule } = source;
      return _linkSync({ weslSrc, rootModuleName: rootModule });
    }
    case "parse": {
      const { weslSrc } = source;
      const registry = parsedRegistry();
      parseIntoRegistry(weslSrc, registry, "package");
      return registry;
    }
    case "tokenize": {
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
    }
    case "wgsl-reflect": {
      const { weslSrc } = source;
      const allText = Object.values(weslSrc).join("\n");
      return new WgslReflect(allText);
    }
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}