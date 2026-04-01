import { parseSrcModule } from "wesl";
import type { WeslSource } from "../LoadExamples.ts";

export function run(source: WeslSource): void {
  for (const [filePath, src] of Object.entries(source.weslSrc)) {
    parseSrcModule({ modulePath: filePath, debugFilePath: filePath, src });
  }
}
