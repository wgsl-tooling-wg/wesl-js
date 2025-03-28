import { expectTrimmedMatch } from "@wesl/mini-parse/vitest-util";
import { linkTestOpts } from "./TestUtil.ts";

Deno.test("simple virtual module", async () => {
  const src = `
    import virt::Uniforms;
    @binding(0) @group(0) var<uniform> u: Uniforms;
  `;
  const result = await linkTestOpts(
    { virtualLibs: { virt: () => "struct Uniforms { foo: u32 }" } },
    src,
  );
  const expected = `
    @binding(0) @group(0) var<uniform> u: Uniforms;
    struct Uniforms { foo: u32 }
  `;
  expectTrimmedMatch(result, expected);
});

Deno.test("virtual constants", async () => {
  const src = `
    import constants::num_lights;
    fn main() {
      for (var i = 0; i < num_lights; i++) { }
    }
  `;
  const result = await linkTestOpts({ constants: { num_lights: 4 } }, src);
  const expected = `
    fn main() {
      for (var i = 0; i < num_lights; i++) { }
    }

    const num_lights = 4;
  `;
  expectTrimmedMatch(result, expected);
});
