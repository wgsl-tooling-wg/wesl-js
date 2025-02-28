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
                    ^^"
  `);
});
