import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { withLogSpyAsync } from "mini-parse/test-util";
import { expect, test } from "vitest";
import { cli } from "../src/cli.js";

/** so vitest triggers when these files change */
import("./shaders/main.wgsl?raw");
import("./shaders/util.wgsl?raw");

const testDir = dirname(fileURLToPath(import.meta.url));

test("simple link", async () => {
  const logged = await cliLine(`--projectDir ${testDir}`);
  expect(logged).toMatchInlineSnapshot(`
    "

    fn main() {
      foo();
    }

    // TBD
    // @if EXTRA 
    // fn extra() { }


    fn foo() {
      // fooImpl
    }"
  `);
});

test("link with definition", async () => {
  const logged = await cliLine(`--projectDir ${testDir} --define EXTRA=true`);
  expect(logged).toContain("fn extra()");
});

/** run the CLI command and return the logged output */
async function cliLine(argsLine: string): Promise<string> {
  return await withLogSpyAsync(() => cli(argsLine.split(/\s+/)));
}
