import { withLoggerAsync } from "mini-parse";
import { logCatch } from "mini-parse/test-util";
import { expect, test } from "vitest";
import { link } from "../Linker.ts";
import { linkWithLogQuietly } from "./TestUtil.ts";

test("unresolved identifier", async () => {
  const src = `
    fn main() { x = 7; }
    `;
  const { log } = await linkWithLogQuietly(src);
  expect(log).toMatchInlineSnapshot(`
    "unresolved identifier 'x' in file: ./test.wesl
        fn main() { x = 7; }   Ln 2
                    ^"
  `);
});

test("conditionally empty struct", async () => {
  const src = `
    struct Empty {
      @if(false) u: u32,
    }
    `;
  const { log } = await linkWithLogQuietly(src);
  expect(log).toMatchInlineSnapshot(
    `
    "struct 'Empty' has no members (with current conditions) in file: ./test.wesl
        struct Empty {   Ln 2
               ^^^^^"
  `,
  );
});

test("debugWeslRoot in error messages", async () => {
  const weslSrc = { "main.wesl": "fn main() { x = 7; }" };
  const { log, logged } = logCatch();
  try {
    await withLoggerAsync(log, async () =>
      link({ weslSrc, rootModuleName: "main.wesl", debugWeslRoot: "shaders/" }),
    );
  } catch (_e) {
    // expected to throw
  }
  expect(logged()).toContain("shaders/main.wesl");
});
