import { _linkSync } from "wesl";
import type { WeslSource } from "../LoadExamples.ts";

export function run(source: WeslSource): void {
  _linkSync({ weslSrc: source.weslSrc, rootModuleName: source.rootModule });
}
