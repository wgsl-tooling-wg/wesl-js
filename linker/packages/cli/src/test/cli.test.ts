import { withLogger } from "mini-parse";
import { logCatch } from "mini-parse/test-util";
import { expectTrimmedMatch } from "mini-parse/vitest-util";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { cli } from "../cli.js";

/** so vitest triggers when these files change */
import("./src/test/wgsl/main.wgsl?raw");
import("./src/test/wgsl/util.wgsl?raw");

const testDir = dirname(fileURLToPath(import.meta.url));
const wgslDir = testDir + "/wgsl";
const mainPath = wgslDir + "/main.wgsl";
const utilPath = wgslDir + "/util.wgsl";

test("simple link", async () => {
  const logged = await cliLine(`${mainPath} ${utilPath} --baseDir ${wgslDir}`);
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

const packagePath = /^package::.*::(.*)$/gm;
test("link --details", async () => {
  const line = `${mainPath} ${utilPath} --baseDir ${wgslDir}
     --details 
     --emit false`;

  const logged = await cliLine(line);
  // Remove the directory specific path before the logs
  const noPackagePaths = logged.replace(packagePath, "package::$1");
  expectTrimmedMatch(
    noPackagePaths,
    `
    ---
    package::main

    ->ast
    module
      import package::util::foo;
    
      text '
    '
      fn main()
        text 'fn '
        decl %main
        text '() {
      '
        ref foo
        text '();
    }'
      text '

    // TBD
    // @if EXTRA 
    // fn extra() { }
    '

    ->scope
    { %main
      { foo }
    }

    ---
    package::util

    ->ast
    module
      fn foo()
        text 'fn '
        decl %foo
        text '() {
      // fooImpl
    }'

    ->scope
    { %foo
      {  }
    }
  `,
  );
});

test.skip("link with definition", async () => {
  const logged = await cliLine(
    `./src/test/wgsl/main.wgsl 
       ./src/test/wgsl/util.wgsl
       --define EXTRA=true`,
  );
  expect(logged).toContain("fn extra()");
});

async function cliLine(argsLine: string): Promise<string> {
  return await withConsoleSpy(() => cli(argsLine.split(/\s+/)));
}

async function withConsoleSpy(fn: () => Promise<void>): Promise<string> {
  const catcher = logCatch();
  withLogger(c => catcher.log(c), fn);
  return catcher.logged();
}
