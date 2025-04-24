import { cp, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import path from "path";
import { rimraf } from "rimraf";
import { expect, test } from "vitest";
import { packagerCli } from "../packagerCli.js";
import fs from "node:fs/promises";
import { dlog } from "berry-pretty";
import {tmpdir} from "node:os";
import { stat } from "node:fs";

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
  const result = await readFile(path.join(distDir, "weslBundle.js"), "utf8");
  expect(result).toMatchInlineSnapshot(`
    "
    export const weslBundle = {
      "name": "test-wesl-package",
      "edition": "unstable_2025_1",
      "modules": {
        "util.wgsl": "fn foo() {}",
        "lib.wesl": "import package::util;\\n"
      }
    }

    export default weslBundle;
      "
  `);
});

test.only("package multi ", async () => {
  // create a copy of multi_package in a temporary directory so we can mutate it
  const workDir = "/tmp/testing_multi";
  await rimraf(workDir);
  await mkdir(workDir);

  // const workDir = await fs.mkdtemp("wesl-packager-test-multi-");
  dlog({workDir})
  try {
    const multiDir = path.join(testDir, "multi_package");
    await fs.cp(multiDir, workDir, {
      recursive: true,
      preserveTimestamps: true,
    });

    const distDir = path.join(workDir, "dist");
    // run wesl-packager in temporary directory
    await packageCli(
      `--projectDir ${workDir}
      --src ${workDir}/shaders/**/*.wesl
      --updatePackageJson
      --multiBundle
      --rootDir ${workDir}/shaders
      --outDir ${distDir}`,
    );

  // verify package.json
  const packageJson = await readFile(path.join(workDir, "package.json"), "utf8");
  expect(packageJson).toMatchInlineSnapshot(`
    "{
      "name": "multi-package",
      "private": true,
      "dependencies": {
        "dependent_package": "link:../dependent_package"
      },
      "exports": {
        "./*": {
          "import": "./dist/*/weslBundle.js",
          "types": "./dist/weslBundle.d.ts"
        }
      }
    }"
  `);

  // verify dist bundles
  const nestedBundle = await readFile(path.join(workDir, "dist/dir/nested/weslBundle.js"), "utf8");
  expect(nestedBundle).toMatchInlineSnapshot(`
    "
    export const weslBundle = {
      "name": "multi-package",
      "edition": "unstable_2025_1",
      "modules": {
        "dir/nested.wesl": "fn nest() {} "
      }
    }

    export default weslBundle;
      "
  `);

  const dts = await readFile(path.join(workDir, "dist/weslBundle.d.ts"), "utf8");
  expect(dts).toMatchInlineSnapshot(`
    "export interface WeslBundle {
      /** name of the package, e.g. random_wgsl */
      name: string;

      /** wesl edition of the code e.g. unstable_2025_1 */
      edition: string;

      /** map of wesl/wgsl modules:
       *    keys are file paths, relative to package root (e.g. "./lib.wgsl")
       *    values are wgsl/wesl code strings
       */
      modules: Record<string, string>;

      /** packages referenced by this package */
      dependencies?: WeslBundle[];
    }

    export declare const weslBundle: WeslBundle;
    export default weslBundle;
    "
  `);

  const multi = await readFile(path.join(workDir, "dist/multi/weslBundle.js"), "utf8");
  expect(multi).toMatchInlineSnapshot(`
    "
    export const weslBundle = {
      "name": "multi-package",
      "edition": "unstable_2025_1",
      "modules": {
        "multi.wesl": "import dependent_package::dep;\\n\\nfn multi() { dep(); } "
      }
    }

    export default weslBundle;
      "
  `);

  } finally {
    // await rimraf(workDir);
  }
});

function packageCli(argsLine: string): Promise<void> {
  return packagerCli(argsLine.split(/\s+/));
}
