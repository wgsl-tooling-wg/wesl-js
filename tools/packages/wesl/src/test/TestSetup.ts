import { beforeEach } from "vitest";
import { enableTracing } from "../Logging.ts";
import { resetScopeIds } from "../Scope.ts";

enableTracing();

// Auto-reset scope IDs before each test for consistent output
beforeEach(() => {
  resetScopeIds();
});
