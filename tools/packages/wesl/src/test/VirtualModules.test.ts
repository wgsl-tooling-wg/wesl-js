import { expect, test } from "vitest";
import { link } from "../Linker.ts";
import { linkTestOpts } from "./TestUtil.ts";
import { expectTrimmedMatch } from "./TrimmedMatch.ts";

test("simple virtual module", async () => {
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

test("virtual constants", async () => {
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

// WGSL reserved words (like 'common') are allowed in module paths per WESL spec.
test("inline reference to virtual module with reserved word name", async () => {
  const result = await link({
    weslSrc: { "./main.wesl": "fn main() { let x = common::value; }" },
    rootModuleName: "main",
    virtualLibs: { common: () => "const value = 42;" },
  });
  expect(result.dest).toContain("const value = 42");
});

test("inline constant in array template param", async () => {
  const src = `
    fn main() {
      var data: array<f32, constants::size>;
    }
  `;
  const result = await linkTestOpts({ constants: { size: 4 } }, src);
  expect(result).toContain("const size = 4");
});

test("function call with inline ref in template param", async () => {
  const src = `
    fn main() {
      var data: array<f32, u32(constants::size)>;
    }
  `;
  const result = await linkTestOpts({ constants: { size: 4 } }, src);
  expect(result).toContain("const size = 4");
});
