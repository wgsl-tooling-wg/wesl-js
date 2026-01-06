import { enableTracing } from "mini-parse";
import { beforeEach } from "vitest";
import { weslParserConfig } from "../ParseWESL.ts";
import { resetScopeIds } from "../Scope.ts";

/** Configure parser for tests */
export function configureTestParser(useV2: boolean, _label: string): void {
  enableTracing();
  weslParserConfig.useV2Parser = useV2;
  // console.log(`[${label}] Using ${useV2 ? "V2" : "V1"} parser`);
}

// Auto-reset scope IDs before each test for consistent output
beforeEach(() => {
  resetScopeIds();
});
