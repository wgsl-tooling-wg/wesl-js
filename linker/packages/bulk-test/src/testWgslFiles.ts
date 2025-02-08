import { expectNoLog } from "mini-parse/test-util";
import fs from "node:fs/promises";
import { expect, test } from "vitest";
import { bindingStructsPlugin, link, noSuffix } from "wesl";

export interface NamedPath {
  name: string; // test name
  filePath: string; // path relative to project root (package.json dir)
}

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
      const text = await fs.readFile(filePath, { encoding: "utf8" });
      const result = expectNoLog(() => {
        const weslSrc = { [shortPath]: text };
        const rootModuleName = noSuffix(name);
        return link({ weslSrc, rootModuleName, config });
      });
      expect(result.dest).eq(text);
    });
  });
}
