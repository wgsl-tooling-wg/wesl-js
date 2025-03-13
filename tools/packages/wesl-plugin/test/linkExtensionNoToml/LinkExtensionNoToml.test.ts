/// <reference types="wesl-plugin/suffixes" />
import { expect, expectTypeOf, test } from "vitest";
import { LinkParams } from "wesl";
import linkParams from "./shaders/app.wesl?link";

test("verify ?link", async () => {
  expectTypeOf(linkParams).toMatchTypeOf<LinkParams>();

  const { rootModuleName, debugWeslRoot, weslSrc, libs } =
    linkParams as LinkParams;
  expect(rootModuleName).toMatchInlineSnapshot(`"app"`);

  expect(debugWeslRoot).toMatchInlineSnapshot(`"shaders"`);

  expect(weslSrc).toMatchInlineSnapshot(`
    {
      "app.wesl": "main() {
       package::other();
    }",
      "other.wesl": "fn other() { }",
    }
  `);
});
