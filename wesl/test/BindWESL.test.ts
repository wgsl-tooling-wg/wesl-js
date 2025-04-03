import { expect, test } from "vitest";
import { scopeToStringLong } from "../debug/ScopeToString.ts";
import { bindTest } from "./TestUtil.ts";

test("nested scopes binding", () => {
  const src = `
    fn main() {
      let bar = 72;
      if (true) {
        if (true) {
          let new_bar = bar; // Should be 72!
        }
        let bar = 5;
      }
    }
  `;

  const { registry } = bindTest(src);
  const ast = registry.modules["package::test"];

  expect(scopeToStringLong(ast.rootScope)).toMatchInlineSnapshot();
});

test("@location attribute const", () => {
  const src = `
    const pos = 0;

    @fragment
    fn fragmentMain(@location(0) pos : vec3f) -> @location(pos) vec4f { 
      let x = pos;
    }
  `;
  const { registry } = bindTest(src);
  const ast = registry.modules["package::test"];
  expect(scopeToStringLong(ast.rootScope)).toMatchInlineSnapshot();
});
