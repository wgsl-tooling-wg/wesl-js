import { expect, test } from "vitest";
import { bindTest } from "./TestUtil.ts";
import { scopeToString } from "../debug/ScopeToString.ts";

test("nested scopes binding", async () => {
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

  expect(scopeToString(ast.rootScope, 0, false)).toMatchInlineSnapshot(`
    "{ %main(main) #1  
      { %bar(bar) #3  
        { 
          { %new_bar #5  bar #7 -> %bar(bar) #3  } #3
          %bar #9 
        } #2
      } #1
    } #0"
  `);
});
