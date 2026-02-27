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

test("constant in @binding attribute", async () => {
  const src = `
    @group(0) @binding(constants::slot) var<uniform> u: f32;
  `;
  const result = await linkTestOpts({ constants: { slot: 0 } }, src);
  expect(result).toContain("const slot = 0");
  expect(result).toContain("@binding(slot)");
});

test("package:: import from virtual module", async () => {
  const src = `
    import virt::helper;
    fn main() { let x = helper(); }
  `;
  const file1 = `fn util_fn() -> u32 { return 1; }`;
  const opts = {
    virtualLibs: {
      virt: () => `
        import package::file1::util_fn;
        fn helper() -> u32 { return util_fn(); }
      `,
    },
  };
  const result = await linkTestOpts(opts, src, file1);
  expect(result).toContain("fn helper()");
  expect(result).toContain("fn util_fn()");
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
