import { test } from "vitest";

// /* Live network test: fetches the real `lygia` tarball from npm and exercises
//  * the full fetch + DecompressionStream + parseTar path.  */
// test("fetch lygia from npm and extract bundle files", async () => {
//   const files = await fetchBundleFilesFromNpm("lygia");
//   expect(files.length).toBeGreaterThan(0);
//   for (const f of files) {
//     expect(f.packagePath).toMatch(/weslBundle\.js$/);
//     expect(f.packageName).toBeTruthy();
//   }
// }, 30_000);

test("skipped", () => {});
