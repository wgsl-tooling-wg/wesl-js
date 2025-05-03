/// <reference types="wesl-plugin/suffixes" />
import { test, expect } from "vitest";
import linkParams from "../shaders/main.wesl?link";
import { link } from "wesl";

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