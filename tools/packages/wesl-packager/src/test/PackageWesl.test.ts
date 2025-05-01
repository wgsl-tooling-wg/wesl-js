import fs, { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import path from "path";
import { rimraf } from "rimraf";
import { expect, test } from "vitest";
import { packagerCli } from "../PackagerCli.js";
import { expectDirMatch } from "./ExpectDirMatch.js";

const testDir = dirname(fileURLToPath(import.meta.url));

test("package two wgsl files into one bundle", async () => {
  const projectDir = path.join(testDir, "wesl-package");
  const distDir = path.join(projectDir, "dist");
  const srcDir = path.join(projectDir, "src");
  await rimraf(distDir);
  await mkdir(distDir);
  await packageCli(
    `--projectDir ${projectDir} 
     --rootDir ${srcDir} 
     --updatePackageJson false
     --src ${srcDir}/*.w[eg]sl
     --outDir ${distDir}`,
  );
  const result = await readFile(path.join(distDir, "weslBundle.js"), "utf8");
  expect(result).toMatchInlineSnapshot(`
    "export const weslBundle = {
      name: "test-wesl-package",
      edition: "unstable_2025_1",
      modules: {
        "util.wgsl": "fn foo() {}",
        "lib.wesl": "import package::util;\\n",
      },
    };

    export default weslBundle;
    "
  `);
});

test("package multi ", async () => {
  // create a copy of multi_package in a temporary directory so we can mutate it
  const workDir = "/tmp/testing_multi";
  await rimraf(workDir);
  await mkdir(workDir);

  // const workDir = await fs.mkdtemp("wesl-packager-test-multi-");
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

    const expectDir = path.join(testDir, "../../../test_pkg/multi_pkg");
    expectDirMatch(workDir, expectDir);

  } finally {
    // await rimraf(workDir);
  }
});

function packageCli(argsLine: string): Promise<void> {
  return packagerCli(argsLine.split(/\s+/));
}
