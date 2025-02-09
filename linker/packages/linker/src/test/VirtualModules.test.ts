import { test } from "vitest";
import { linkTestOpts } from "./TestUtil.ts";
import { expectTrimmedMatch } from "./shared/StringUtil.ts";

test("simple virtual module", () => {
  const src = `
    import virt::Uniforms;
    @binding(0) @group(0) var<uniform> u: Uniforms;
  `;
  const result = linkTestOpts(
    { virtualModules: { virt: () => "struct Uniforms { foo: u32 }" } },
    src,
  );
  const expected = `
      @binding(0) @group(0) var<uniform> u: Uniforms;
  struct Uniforms { foo: u32 }
  `;
  expectTrimmedMatch(result, expected);
});
