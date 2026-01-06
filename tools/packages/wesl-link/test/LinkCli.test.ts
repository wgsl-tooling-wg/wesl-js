import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { withLogSpyAsync } from "mini-parse/test-util";
import { expect, test } from "vitest";
import { weslParserConfig } from "wesl";
import { cli } from "../src/LinkCli.ts";

/** so vitest triggers when these files change */
import("./shaders/main.wgsl?raw");
import("./shaders/util.wgsl?raw");

const testDir = dirname(fileURLToPath(import.meta.url));

test("simple link", async () => {
  const logged = await cliLine(`--projectDir ${testDir}`);

  if (weslParserConfig.useV2Parser) {
    // V2 output
    expect(logged).toMatchInlineSnapshot(`
      "

      fn main() {
        foo();
      }

      fn foo() {
        // fooImpl
      }"
    `);
  } else {
    // V1 output with extra blank lines
    expect(logged).toMatchInlineSnapshot(`
      "

      fn main() {
        foo();
      }




      fn foo() {
        // fooImpl
      }"
    `);
  }
});

test("link with condition", async () => {
  const logged = await cliLine(`--projectDir ${testDir} --conditions EXTRA`);
  expect(logged).contains("fn extra()");
});

/** run the CLI command and return the logged output */
async function cliLine(argsLine: string): Promise<string> {
  return await withLogSpyAsync(() => cli(argsLine.split(/\s+/)));
}

test("link with details", async () => {
  const logged = await cliLine(`--projectDir ${testDir} --details --no-emit`);
  expect(logged).includes("decl %foo");
  expect(logged).includes("decl %main");
});

test("link with positional arg", async () => {
  const logged = await cliLine(`--projectDir ${testDir} main`);
  expect(logged).includes("fn main()");
  expect(logged).includes("fn foo()");
});
