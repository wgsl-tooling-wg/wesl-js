import { test } from "vitest";
import { underscoreMangle } from "../Mangler.ts";
import { expectTrimmedMatch } from "./shared/StringUtil.ts";
import { linkTestOpts } from "./TestUtil.ts";

test("underscoreMangle", async () => {
  const main = `
    import package::file1::bar;
fn main() { bar(); }
  `;
  const file1 = `
    fn bar() {};
  `;

  const linked = await linkTestOpts({ mangler: underscoreMangle }, main, file1);
  const expected = `
    fn main() { __file1_bar(); }
    fn __file1_bar() {}
  `;
  expectTrimmedMatch(linked, expected);
});
