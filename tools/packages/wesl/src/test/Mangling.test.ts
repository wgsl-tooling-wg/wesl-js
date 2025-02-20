import { test } from "vitest";
import { link } from "../Linker.ts";
import { lengthPrefixMangle } from "../Mangler.ts";
import { expectTrimmedMatch } from "./shared/StringUtil.ts";
import { linkTestOpts } from "./TestUtil.ts";

test("lengthPrefixMangle", async () => {
  const main = `
    import package::file1::bar;
fn main() { bar(); }
  `;
  const file1 = `
    fn bar() {};
  `;

  const linked = await linkTestOpts(
    { mangler: lengthPrefixMangle },
    main,
    file1,
  );
  const expected = `
    fn main() { _7package5file13bar(); }
    fn _7package5file13bar() {}
  `;
  expectTrimmedMatch(linked, expected);
});

test("lengthPrefixMangle longer ident", async () => {
  const main = `
    import package::container::file1::bar;
fn main() { bar(); }
  `;
  const file1 = `
    fn bar() {};
  `;
  const weslSrc = { "./main.wesl": main, "./container/file1.wesl": file1 };

  const linked = await link({
    mangler: lengthPrefixMangle,
    weslSrc,
    debugWeslRoot: "main",
  });

  const expected = `
    fn main() { _7package9container5file13bar(); }
    fn _7package9container5file13bar() {}
  `;
  expectTrimmedMatch(linked.dest, expected);
});
