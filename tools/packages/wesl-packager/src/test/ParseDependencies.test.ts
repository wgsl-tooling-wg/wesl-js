import { expect, test } from "vitest";
import { parseDependencies } from "../ParseDependencies.ts";

const thisDir = import.meta.dirname;

test("parseDepenencies finds non-root dependency", () => {
  const srcs = {
    main:`
      import package::foo::bar;
      fn main() { }
    `,
    foo: `
      import dependent_package::dep;

      fn bar() { 
        dep(); // should be a package dependency for a library even though it's not referenced from root
      }
    `
  };
  const deps = parseDependencies(srcs, thisDir);
  expect(deps).deep.equals(["dependent_package"]);
});