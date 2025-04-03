import { expectNoLogAsync } from "@wesl/mini-parse/test-util";
import { bindingStructsPlugin, link, noSuffix } from "@wesl/wesl";
import { stripWesl } from "./stripWgsl.ts";
import { allBulkTests, NamedPath } from "./findBulkTests.ts";
import { expect, test } from "vitest";

/**
 * Each test runs the linker on a source wgsl files and verifies
 * that the linker runs w/o error and that the linked output matches the input
 *
 * @param fileNames wgsl file paths to load and parse
 */
export function testWgslFiles(namedPaths: NamedPath[]) {
  const config = { plugins: [bindingStructsPlugin()] };

  namedPaths.forEach(({ name, filePath }) => {
    const shortPath = "./" + name;
    test(name, async () => {
      const orig = await Deno.readTextFile(filePath);
      const result = await expectNoLogAsync(() => {
        const weslSrc = { [shortPath]: orig };
        const rootModuleName = noSuffix(name);
        return link({ weslSrc, rootModuleName, config });
      });
      expect(stripWesl(result.dest)).toBe(stripWesl(orig));
    });
  });
}

testWgslFiles(allBulkTests);
const somePaths = allBulkTests.filter((p) =>
  p.name.includes("fullscreenTexturedQuad.wgsl")
);
testWgslFiles(somePaths);
