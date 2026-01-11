import { readFileSync } from "node:fs";

/** Size of TestResult struct in bytes.
 * Layout: u32 passed (4) + u32 failCount (4) + padding (8) + vec4f actual (16) + vec4f expected (16) = 48 */
export const testResultSize = 48;

let cachedTestLibSrc: string | undefined;

/** Virtual library for test:: namespace providing assertions and result reporting. */
export function testVirtualLib(): string {
  if (!cachedTestLibSrc) {
    cachedTestLibSrc = readFileSync(
      new URL("./test_lib.wesl", import.meta.url),
      "utf-8",
    );
  }
  return cachedTestLibSrc;
}
