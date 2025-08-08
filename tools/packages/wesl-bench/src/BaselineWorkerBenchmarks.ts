import { WgslReflect } from "wgsl_reflect";
import {
  _linkSync,
  parsedRegistry,
  parseIntoRegistry,
  WeslStream,
} from "../../../../_baseline/packages/wesl/src/index.ts";
import { srcToText, tokenize } from "./BenchUtils.ts";
import type { BenchParams } from "./WorkerBenchmarks.ts";

/** @return baseline benchmark result using _baseline imports */
export function runBaselineBenchmark(params: BenchParams) {
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
      // wgsl-reflect doesn't change between baseline and current
      const { weslSrc } = source;
      return new WgslReflect(srcToText(weslSrc));
    }
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}
