/// <reference types="wesl-plugin/suffixes" />
import { expect, expectTypeOf, test } from "vitest";
import type { LinkParams } from "wesl";
import linkParams from "../shaders/foo/app.wesl?link";

test("verify ?link", async () => {
  expectTypeOf(linkParams).toMatchTypeOf<LinkParams>();

  const { rootModuleName, debugWeslRoot, weslSrc, libs } =
    linkParams as LinkParams;
  expect(rootModuleName).toMatchInlineSnapshot(`"app"`);

  expect(debugWeslRoot).toMatchInlineSnapshot(`"shaders/foo"`);

  expect(weslSrc).toMatchInlineSnapshot(`
    {
      "app.wesl": "import random_wgsl::pcg_2u_3f;

    main() {
       let a = pcg_2u3f(vec2u(1, 2)); 
    }",
    }
  `);
  expect(libs?.length).equal(1);
  const firstDep = libs![0];
  expect(firstDep.name).toMatchInlineSnapshot(`"random_wgsl"`);
  expect([...Object.keys(firstDep.modules)]).toMatchInlineSnapshot(`
    [
      "randomTest.wgsl",
      "lib.wgsl",
    ]
  `);
});
