/// <reference types="wesl-plugin/suffixes" />
import { dlog } from "berry-pretty";
import { expect, expectTypeOf, test } from "vitest";
import { LinkParams } from "wesl";
import linkParams from "./shaders/app.wesl?link";

test("verify ?link", async () => {
  expectTypeOf(linkParams).toMatchTypeOf<LinkParams>();

  const { rootModuleName, debugWeslRoot, weslSrc, libs } =
    linkParams as LinkParams;
  expect(rootModuleName).toMatchInlineSnapshot(`"app"`);

  dlog("fixme", { debugWeslRoot });
  // TODO this result can't be right... weslRoot should be relative to the tomlDir probably.
  // expect(debugWeslRoot).toMatchInlineSnapshot(`"packages/wesl-plugin/test/linkExtension/shaders"`);

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
      "lib.wgsl",
    ]
  `);
});
