import { RecordResolver } from "../../../../../_baseline/packages/wesl/src/index.ts";
import type { WeslSource } from "../LoadExamples.ts";

export function run(source: WeslSource): void {
  new RecordResolver(source.weslSrc);
}
