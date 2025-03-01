import { expectNoLogAsync } from "mini-parse/test-util";
import fs from "node:fs/promises";
import { expect, test } from "vitest";
import { bindingStructsPlugin, link, noSuffix } from "wesl";
import { stripWesl } from "./stripWgsl";

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
export async function testWgslFiles(namedPaths: NamedPath[]) {
  const config = { plugins: [bindingStructsPlugin()] };

  namedPaths.forEach(({ name, filePath }) => {
    test(name, async () => {
      const text = await fs.readFile(filePath, { encoding: "utf8" });
      const result = await expectNoLogAsync(() => {
        const shortPath = "./" + name;
        const weslSrc = { [shortPath]: text };
        const rootModulePath = ["package", ...noSuffix(name).split("/")];
        return link({ weslSrc, rootModulePath, config });
      });
      expect(stripWesl(result.dest)).toBe(stripWesl(text));
    });
  });
}
