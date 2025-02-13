import { expect, test } from "vitest";
import { linkWithLog } from "./TestUtil.ts";

test("unresolved identifier", async () => {
  const src = `
    fn main() { x = 7; }
    `;
  const { log } = await linkWithLog(src);
  expect(log).toMatchInlineSnapshot(`
    "unresolved identifier in file: ./test.wesl
        fn main() { x = 7; }   Ln 2
                    ^^"
  `);
});
