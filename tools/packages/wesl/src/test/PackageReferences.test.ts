import { expect, test } from "vitest";
import { packageReferences } from "../parse/PackageReferences.ts";

test("find imported package references in a wesl file", () => {
  const src = `
    // comment
    import random_wgsl::random;
    import super::something;

    /** other comment */
    import foo::bar;

    fn main() { }
    `;

  const pkgs = packageReferences(src);
  expect(pkgs).toEqual(["random_wgsl", "foo"]);
});
