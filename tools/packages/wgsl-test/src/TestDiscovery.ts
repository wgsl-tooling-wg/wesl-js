import type { FnElem, TestAttribute, WeslAST } from "wesl";

export interface TestFunctionInfo {
  name: string;
  description?: string;
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
    .map(fn => ({
      name: fn.name.ident.originalName,
      description: getTestDescription(fn),
      fn,
    }));
}

function hasTestAttribute(fn: FnElem): boolean {
  return !!getTestAttribute(fn);
}

function getTestAttribute(fn: FnElem): TestAttribute | undefined {
  const attr = fn.attributes?.find(e => e.attribute.kind === "@test");
  return attr?.attribute as TestAttribute | undefined;
}

/** Extract description from @test(description) attribute. */
function getTestDescription(fn: FnElem): string | undefined {
  const testAttr = getTestAttribute(fn);
  return testAttr?.description?.name;
}
