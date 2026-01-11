import type { FnElem, WeslAST } from "wesl";

export interface TestFunctionInfo {
  name: string;
  fn: FnElem;
}

/** Find all functions marked with @test attribute in a parsed WESL module. */
export function findTestFunctions(ast: WeslAST): TestFunctionInfo[] {
  return ast.moduleElem.contents
    .filter((e): e is FnElem => e.kind === "fn")
    .filter(hasTestAttribute)
    .filter(fn => {
      if (fn.params.length > 0) {
        const name = fn.name.ident.originalName;
        console.warn(
          `@test function '${name}' has parameters and will be skipped`,
        );
        return false;
      }
      return true;
    })
    .map(fn => ({ name: fn.name.ident.originalName, fn }));
}

function hasTestAttribute(fn: FnElem): boolean {
  return !!fn.attributes?.some(
    e => e.attribute.kind === "@attribute" && e.attribute.name === "test",
  );
}
