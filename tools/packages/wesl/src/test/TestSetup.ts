import { beforeEach } from "vitest";
import { resetScopeIds } from "wesl";
import { resetScopeIds as resetSourceScopeIds } from "../Scope.ts";

// Auto-reset scope IDs before each test for consistent output
// Reset both source and built counters (nodebug tests alias wesl to dist-nodebug)
beforeEach(() => {
  resetScopeIds();
  resetSourceScopeIds();
});
