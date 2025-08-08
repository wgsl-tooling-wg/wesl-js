import { WgslReflect } from "wgsl_reflect";
import {
  _linkSync,
  parsedRegistry,
  parseIntoRegistry,
  WeslStream,
} from "../../../../_baseline/packages/wesl/src/index.ts";
import type { BenchParams } from "./WorkerBenchmarks.ts";

/** Baseline benchmark function called by workers - imports from _baseline directory */
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
      // wgsl-reflect doesn't change between baseline and current
      const { weslSrc } = source;
      const allText = Object.values(weslSrc).join("\n");
      return new WgslReflect(allText);
    }
    default:
      throw new Error(`Unknown variant: ${variant}`);
  }
}
