import { _linkSync } from "../../../../../_baseline/packages/wesl/src/index.ts";
import type { WeslSource } from "../LoadExamples.ts";

export function run(source: WeslSource): void {
  _linkSync({ weslSrc: source.weslSrc, rootModuleName: source.rootModule });
}
