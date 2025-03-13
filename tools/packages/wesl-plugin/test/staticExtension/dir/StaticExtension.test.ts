/// <reference types="wesl-plugin/suffixes" />
import { expect, expectTypeOf, test } from "vitest";
import wgsl from "../shaders/foo/app.wesl?static";

test("verify ?static", async () => {
  expectTypeOf(wgsl).toMatchTypeOf<string>();
  expect(wgsl).toMatchInlineSnapshot(`
    "fn main() {
       let a = 1; 
    }"
  `);
});
