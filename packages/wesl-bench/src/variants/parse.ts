import { RecordResolver } from "wesl";
import type { WeslSource } from "../LoadExamples.ts";

export function run(source: WeslSource): void {
  new RecordResolver(source.weslSrc);
}
