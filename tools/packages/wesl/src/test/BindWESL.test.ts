import { expect, test } from "vitest";
import { ParsedRegistry, publicDecl, resetScopeIds } from "wesl";
import { bindIdents } from "../BindIdents.ts";
import { scopeToStringLong } from "../debug/ScopeToString.ts";
import { bindTest, parseTest } from "./TestUtil.ts";

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
  const ast = registry.resolveModule("package::test")!;

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
  const ast = registry.resolveModule("package::test")!;
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
  const registry = new ParsedRegistry({ main });
  const rootAst = registry.resolveModule("package::main")!;
  const resolver = registry;
  const bindResult = bindIdents({ resolver, rootAst, accumulateUnbound: true });

  const expected = ["pkg1::bar::baz", "pkg2::foo"];
  const expectedArrays = expected.map(s => s.split("::")).sort();
  expect(bindResult.unbound?.sort()).deep.equal(expectedArrays);
});

test("publicDecl finds valid conditional declaration", () => {
  const src = `
    @if(FOO)
    fn testFn() { let a = 0; }
    @else
    fn testFn() { let a = 1; }

    fn otherFn() { }
  `;

  const ast = parseTest(src);
  const conditions = {}; // FOO is false

  // First call should find @else function
  const decl1 = publicDecl(ast.rootScope, "testFn", conditions);
  expect(decl1).toBeDefined();
  expect(decl1!.originalName).toBe("testFn");

  // Second call should use cache and return same result
  const decl2 = publicDecl(ast.rootScope, "testFn", conditions);
  expect(decl2).toBe(decl1); // Same object reference - caching works

  // Should find other declarations too
  const otherDecl = publicDecl(ast.rootScope, "otherFn", conditions);
  expect(otherDecl).toBeDefined();
  expect(otherDecl!.originalName).toBe("otherFn");
});
