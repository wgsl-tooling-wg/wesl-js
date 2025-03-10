import { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import path from "path";
import { rimraf } from "rimraf";
import { expect, test } from "vitest";
import { packagerCli } from "../packagerCli.js";

const testDir = dirname(fileURLToPath(import.meta.url));

test("package two wgsl files", async () => {
  const projectDir = path.join(testDir, "wesl-package");
  const distDir = path.join(projectDir, "dist");
  const srcDir = path.join(projectDir, "src");
  await rimraf(distDir);
  await mkdir(distDir);
  await packageCli(
    `--projectDir ${projectDir} --rootDir ${srcDir} --outDir ${distDir}`,
  );
  const result = await readFile(path.join(distDir, "wgslBundle.js"), "utf8");
  expect(result).toMatchInlineSnapshot(`
    "
    export const wgslBundle = {
      "name": "test-wesl-package",
      "edition": "wesl_unstable_2024_1",
      "modules": {
        "util.wgsl": "fn foo() {}",
        "lib.wesl": "import package::util;\\n"
      }
    }

    export default wgslBundle;
      "
  `);
});

function packageCli(argsLine: string): Promise<void> {
  return packagerCli(argsLine.split(/\s+/));
}
