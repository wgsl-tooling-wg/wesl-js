import { _linkSync, parsedRegistry, parseIntoRegistry, WeslStream } from "wesl";
import { WgslReflect } from "wgsl_reflect";
import { srcToText, tokenize } from "./BenchUtils.ts";
import type { WeslSource } from "./LoadExamples.ts";
import type { ParserVariant } from "./ParserVariations.ts";

/** Parameters passed to worker benchmark functions */
export interface BenchParams {
  variant: ParserVariant;
  source: WeslSource;
}

/** @return benchmark result for the given variant and source */
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
      return tokenize(srcToText(weslSrc), WeslStream);
    }
    case "wgsl-reflect": {
      const { weslSrc } = source;
      return new WgslReflect(srcToText(weslSrc));
    }
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}
