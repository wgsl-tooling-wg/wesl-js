import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const run = (cmd: string) => execSync(cmd, { cwd: testDir, encoding: "utf8" });

test("verify ?link", { timeout: 30000 }, async () => {
  run(`pnpm vite build`);
  const outFile = join("dist", "noTomlMain.cjs");

  const stdout = run(`pnpm node ${outFile}`);

  // scoped: only modules reachable from app.wesl are included
  expect(stdout).toMatchInlineSnapshot(`
    "{
      "rootModuleName": "app",
      "weslSrc": {
        "app.wesl": "fn main() {\\n   package::other();\\n}"
      },
      "debugWeslRoot": "shaders",
      "shaderRoot": "shaders",
      "libs": []
    }
    "
  `);
});
