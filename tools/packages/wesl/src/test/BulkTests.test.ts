import fs from "node:fs/promises";
import { expectNoLogAsync } from "mini-parse/test-util";
import { describe, expect, test } from "vitest";
import { BaseDir, fetchBulkTest } from "wesl-testsuite/fetch-bulk-tests";
import bulkTests from "wesl-testsuite/test-cases-json/bulkTests" with {
  type: "json",
};
import { link } from "../Linker.ts";
import { stripWesl } from "./StripWesl.ts";

// Make sure the bulk tests are loaded
await Promise.all(
  bulkTests.map(async bulkTest => {
    // We don't support globs in our test suite for performance reasons
    expect(bulkTest.exclude).toEqual([]);
    await fetchBulkTest(bulkTest);
  }),
);

// Run bulk tests
bulkTests.forEach(v => {
  describe(v.baseDir, () => {
    v.include.forEach(filePath => {
      test(filePath, () => runBulkTest(v.baseDir, filePath));
    });
  });
});

test.skip("Debug specific bulk test", async () => {
  const baseDir = "";
  const filePath = "";
  await runBulkTest(baseDir, filePath);
});

// Helper functions
async function runBulkTest(baseDir: string, filePath: string): Promise<void> {
  const orig = await fs.readFile(
    new URL(filePath, new URL(asFolder(baseDir), BaseDir)),
    {
      encoding: "utf8",
    },
  );
  const result = await expectNoLogAsync(() =>
    link({ weslSrc: { "main.wgsl": orig }, rootModuleName: "main" }),
  );
  expect(stripWesl(result.dest)).toBe(stripWesl(orig));
}

function asFolder(path: string) {
  return path.endsWith("/") ? path : path + "/";
}
