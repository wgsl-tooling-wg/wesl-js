import { expect, test } from "vitest";
import { linkWithLogQuietly } from "./TestUtil.ts";

test("unresolved identifier", async () => {
  const src = `
    fn main() { x = 7; }
    `;
  const { log } = await linkWithLogQuietly(src);
  expect(log).toMatchInlineSnapshot();
});

test("conditionally empty struct", async () => {
  const src = `
    struct Empty {
      @if(false) u: u32,
    }
    `;
  const { log } = await linkWithLogQuietly(src);
  expect(log).toMatchInlineSnapshot();
});
