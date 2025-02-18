/// <reference types="wesl-plugin/suffixes" />
import { expect, expectTypeOf, test } from "vitest";
import { LinkConfig } from "wesl";
import linkParams from "./shaders/app.wesl?link";

test("verify ?link", async () => {
  expectTypeOf(linkParams).toMatchTypeOf<LinkConfig>();

  const { rootModuleName, weslRoot, weslSrc, dependencies } = linkParams;
  expect(rootModuleName).toMatchInlineSnapshot(`"./app"`);
  expect(weslSrc).toMatchInlineSnapshot(`
    {
      "./app.wesl": "import random_wgsl::pcg_2u_3f;

    main() {
       let a = pcg_2u3f(vec2u(1, 2)); 
    }",
    }
  `);
  expect(dependencies.length).equal(1);
  const firstDep = dependencies[0];
  expect(firstDep.name).toMatchInlineSnapshot(`"random_wgsl"`);
  expect([...Object.keys(firstDep.modules)]).toMatchInlineSnapshot(`
    [
      "lib.wgsl",
    ]
  `);
});
