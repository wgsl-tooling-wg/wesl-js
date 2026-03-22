import childProcess from "node:child_process";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import util from "node:util";
import { expect, test } from "vitest";

const exec = util.promisify((childProcess as any).exec); // not sure why @types/node for child_process.exec is wrong (nodeExec vs exec)

const testDir = dirname(fileURLToPath(import.meta.url));

test("verify ?link", { timeout: 30000 }, async () => {
  // build test program
  await exec(`pnpm vite build`, { cwd: testDir });
  const outFile = path.join("dist", "noTomlMain.cjs");

  // run a test program that logs the ?link output to the console for verification
  const result = await exec(`pnpm node ${outFile}`, {
    cwd: testDir,
  });

  // scoped: only modules reachable from app.wesl are included
  expect(result.stdout).toMatchInlineSnapshot(`
    "{
      "rootModuleName": "app",
      "weslSrc": {
        "app.wesl": "fn main() {\\n   package::other();\\n}"
      },
      "debugWeslRoot": "shaders",
      "libs": []
    }
    "
  `);
});
