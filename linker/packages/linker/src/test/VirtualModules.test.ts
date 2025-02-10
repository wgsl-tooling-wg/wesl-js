import { test } from "vitest";
import { expectTrimmedMatch } from "./shared/StringUtil.ts";
import { linkTestOpts } from "./TestUtil.ts";

test("simple virtual module", () => {
  const src = `
    import virt::Uniforms;
    @binding(0) @group(0) var<uniform> u: Uniforms;
  `;
  const result = linkTestOpts(
    { virtualLibs: { virt: () => "struct Uniforms { foo: u32 }" } },
    src,
  );
  const expected = `
      @binding(0) @group(0) var<uniform> u: Uniforms;
  struct Uniforms { foo: u32 }
  `;
  expectTrimmedMatch(result, expected);
});
