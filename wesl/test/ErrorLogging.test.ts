import { type expect, test } from "vitest";
import { linkWithLogQuietly } from "./TestUtil.ts";
import { assertSnapshot } from "@std/testing/snapshot";

test("unresolved identifier", async (t) => {
  const src = `
    fn main() { x = 7; }
    `;
  const { log } = await linkWithLogQuietly(src);
  await assertSnapshot(t, log);
});

test("conditionally empty struct", async (t) => {
  const src = `
    struct Empty {
      @if(false) u: u32,
    }
    `;
  const { log } = await linkWithLogQuietly(src);
  await assertSnapshot(t, log);
});
