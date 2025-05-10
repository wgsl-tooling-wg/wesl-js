import { expect, test } from "vitest";
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
