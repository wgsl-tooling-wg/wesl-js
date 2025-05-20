import process from "node:child_process";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import util from "node:util";
import { expect, test } from "vitest";
import { defaultTomlMessage } from "../../../wesl-plugin/src/WeslPlugin.js";
const exec = util.promisify((process as any).exec); // not sure why @types/node for child_process.exec is wrong (nodeExec vs exec)

const testDir = dirname(fileURLToPath(import.meta.url));

test("verify ?link", async () => {
  // build test program
  const buildResult = await exec(`pnpm vite build`, {
    cwd: testDir,
  });
  const outFile = path.join("dist", "noTomlMain.cjs");
  expect(buildResult.stdout).includes(defaultTomlMessage);

  // run a test program that logs the ?link output to the console for verification
  const result = await exec(`pnpm node ${outFile}`, {
    cwd: testDir,
  });

  expect(result.stdout).toMatchInlineSnapshot(`
    "{
      "rootModuleName": "app",
      "weslSrc": {
        "other.wesl": "fn other() { }",
        "app.wesl": "fn main() {\\n   package::other();\\n}"
      },
      "debugWeslRoot": "shaders",
      "libs": []
    }
    "
  `);
});
