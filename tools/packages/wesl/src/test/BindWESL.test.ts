import { expect, test } from "vitest";
import { parseIntoRegistry, parsedRegistry, resetScopeIds } from "wesl";
import { bindIdents } from "../BindIdents.ts";
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

  expect(scopeToStringLong(ast.rootScope)).toMatchInlineSnapshot(`
  "{ 
    -{ %main(main) #1  
      { %bar(bar) #3  
        { 
          { %new_bar #5  bar #7 -> %bar(bar) #3  } #5
          %bar #9 
        } #4
      } #2
    } #1
  } #0"
`);
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
  expect(scopeToStringLong(ast.rootScope)).toMatchInlineSnapshot(`
    "{ 
      -{ %pos(pos) #1  
        {  } #2
      } #1
      -{ %fragmentMain(fragmentMain) #3  pos #9 -> %pos(pos) #1 
         
        { %pos(pos) #5  vec3f #7 -> undefined 
          vec4f #11 -> undefined %x #13  pos #15 -> %pos(pos) #5 }
           #4
      } #3
    } #0"
  `);
});

test("collect unbound references", async () => {
  const main = `
    import pkg1::bar;
    import pkg2::foo;

    const w = 7;

    fn main() {
      let x = foo; // Unbound reference
      let y = bar::baz; // Unbound reference
      let z = w; // Bound reference
    }
   `;

  resetScopeIds();
  const registry = parsedRegistry();
  parseIntoRegistry({ main }, registry);
  const rootAst = registry.modules["package::main"];
  const bindResult = bindIdents({ registry, rootAst, accumulateUnbound: true });

  const expected = ["pkg1::bar::baz", "pkg2::foo"];
  const expectedArrays = expected.map(s => s.split("::")).sort();
  expect(bindResult.unbound?.sort()).deep.equal(expectedArrays);
});
