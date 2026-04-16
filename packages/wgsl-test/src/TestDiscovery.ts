import type { FnElem, StandardAttribute, WeslAST } from "wesl";

export interface TestFunctionInfo {
  name: string;
  description?: string;
  fn: FnElem;
}

export interface SnapshotFunctionInfo {
  name: string;
  snapshotName: string;
  extent: [number, number];
  fn: FnElem;
}

/** Format test name for display: "fnName" or "fnName - description" */
export function testDisplayName(name: string, description?: string): string {
  return description ? `${name} - ${description}` : name;
}

/** Find all functions marked with @test attribute (excluding @snapshot fns). */
export function findTestFunctions(ast: WeslAST): TestFunctionInfo[] {
  return ast.moduleElem.contents
    .filter((e): e is FnElem => e.kind === "fn")
    .filter(fn => hasAttribute(fn, "test") && !hasAttribute(fn, "snapshot"))
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

/** Find all @fragment @snapshot functions in a parsed WESL module. */
export function findSnapshotFunctions(ast: WeslAST): SnapshotFunctionInfo[] {
  const src = ast.srcModule.src;
  return ast.moduleElem.contents
    .filter((e): e is FnElem => e.kind === "fn")
    .filter(fn => hasAttribute(fn, "fragment") && hasAttribute(fn, "snapshot"))
    .map(fn => ({
      name: fn.name.ident.originalName,
      snapshotName: extractSnapshotName(fn),
      extent: extractExtent(fn, src),
      fn,
    }));
}

/** Check whether a function has a given attribute (e.g. "test", "snapshot"). */
function hasAttribute(fn: FnElem, name: string): boolean {
  return (fn.attributes ?? []).some(
    e => e.attribute.kind === "@attribute" && e.attribute.name === name,
  );
}

/** Return a named attribute from a function, or undefined. */
function findAttribute(
  fn: FnElem,
  name: string,
): StandardAttribute | undefined {
  for (const e of fn.attributes ?? []) {
    const attr = e.attribute;
    if (attr.kind === "@attribute" && attr.name === name) return attr;
  }
}

/** Extract snapshot name from @snapshot(name) or fall back to fn name. */
function extractSnapshotName(fn: FnElem): string {
  const param = findAttribute(fn, "snapshot")?.params?.[0];
  const ref = param?.contents.find(c => c.kind === "ref");
  if (ref?.kind === "ref") return ref.ident.originalName;
  return fn.name.ident.originalName;
}

/** Extract extent from @extent(w, h), default [256, 256]. */
function extractExtent(fn: FnElem, src: string): [number, number] {
  const attr = findAttribute(fn, "extent");
  if (!attr?.params) return [256, 256];
  const nums = attr.params.map(p => {
    const text = src.slice(p.start, p.end).trim();
    return Number.parseInt(text, 10) || 256;
  });
  return [nums[0] ?? 256, nums[1] ?? nums[0] ?? 256];
}

/** Extract description from @test(description) attribute. */
function getTestDescription(fn: FnElem): string | undefined {
  const param = findAttribute(fn, "test")?.params?.[0];
  const ref = param?.contents.find(c => c.kind === "ref");
  return ref?.kind === "ref" ? ref.ident.originalName : undefined;
}
