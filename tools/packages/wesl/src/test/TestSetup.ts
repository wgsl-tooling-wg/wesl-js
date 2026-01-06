import { enableTracing } from "mini-parse";
import { beforeEach } from "vitest";
import { resetScopeIds } from "../Scope.ts";

enableTracing();

// Auto-reset scope IDs before each test for consistent output
beforeEach(() => {
  resetScopeIds();
});
