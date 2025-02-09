import { test } from "vitest";
import { linkTestOpts } from "./TestUtil.ts";

test("simple virtual module", () => {
  const src = `
    import virt::Uniforms;
    @binding(0) @group(0) var<uniform> u: Uniforms;
  `;
  const result = linkTestOpts(
    { virtualModules: { virt: () => "struct Uniforms { foo: u32 }" } },
    src,
  );
  console.log(result);
});
