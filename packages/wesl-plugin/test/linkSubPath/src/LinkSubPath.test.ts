/// <reference types="wesl-plugin/suffixes" />
import { expect, test } from "vitest";
import { link } from "wesl";
import linkParams from "../shaders/main.wesl?link";

test("link subpath", async () => {
  const linked = await link(linkParams);
  expect(linked.dest).toMatchInlineSnapshot(`
    "

    fn main() {
      two();
    }

    fn two() { }"
  `);
});
