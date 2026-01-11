import type { FnElem, StandardAttribute, WeslAST } from "wesl";

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

function getTestAttribute(fn: FnElem): StandardAttribute | undefined {
  for (const e of fn.attributes ?? []) {
    const attr = e.attribute;
    if (attr.kind === "@attribute" && attr.name === "test") return attr;
  }
}

/** Extract description from @test(description) attribute. */
function getTestDescription(fn: FnElem): string | undefined {
  const testAttr = getTestAttribute(fn);
  const param = testAttr?.params?.[0];
  if (!param) return undefined;
  // Extract the identifier text from the expression contents
  const text = param.contents.find(c => c.kind === "ref");
  return text?.kind === "ref" ? text.ident.originalName : undefined;
}
