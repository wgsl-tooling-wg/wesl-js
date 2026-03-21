import { expect, test } from "vitest";
import { link } from "../Linker.ts";
import { freshResolver, RecordResolver } from "../ModuleResolver.ts";

test("link twice with same resolver via freshResolver", async () => {
  const weslSrc = {
    "main.wesl": `
      @if(A) fn foo() -> i32 { return 1; }
      @else  fn foo() -> i32 { return 2; }
    `,
  };
  const resolver = new RecordResolver(weslSrc);

  const [r1, r2] = await Promise.all([
    link({
      resolver: freshResolver(resolver),
      rootModuleName: "main",
      conditions: { A: true },
    }),
    link({
      resolver: freshResolver(resolver),
      rootModuleName: "main",
      conditions: { A: false },
    }),
  ]);
  expect(r1.dest).toContain("return 1");
  expect(r2.dest).toContain("return 2");
});

test("freshResolver returns same AST within one instance", () => {
  const resolver = new RecordResolver({ main: `fn foo() {}` });
  const fresh = freshResolver(resolver);
  const ast1 = fresh.resolveModule("package::main");
  const ast2 = fresh.resolveModule("package::main");
  expect(ast1).toBe(ast2);
});

test("freshResolver returns different AST across instances", () => {
  const resolver = new RecordResolver({ main: `fn foo() {}` });
  const ast1 = freshResolver(resolver).resolveModule("package::main");
  const ast2 = freshResolver(resolver).resolveModule("package::main");
  expect(ast1).not.toBe(ast2);
});
