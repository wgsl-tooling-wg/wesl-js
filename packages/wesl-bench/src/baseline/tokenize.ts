import { WeslStream } from "../../../../_baseline/packages/wesl/src/index.ts";
import { srcToText, tokenize } from "../BenchUtils.ts";
import type { WeslSource } from "../LoadExamples.ts";

export function run(source: WeslSource): void {
  tokenize(srcToText(source.weslSrc), WeslStream);
}
