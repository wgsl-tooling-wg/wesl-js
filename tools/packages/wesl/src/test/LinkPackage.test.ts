import { expectNoLogAsync } from "mini-parse/test-util";
import second from "multi_pkg/second";
import trans from "multi_pkg/transitive";
import rand from "random_wgsl";
import { expect, test } from "vitest";
import { link } from "../Linker.ts";

test("import rand() from a package", async () => {
  const src = `
    import random_wgsl::pcg_2u_3f; 

    struct Uniforms { frame: u32 }
    @binding(0) @group(0) var<uniform> u: Uniforms;

    @fragment
    fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
        let rand = pcg_2u_3f(vec2u(pos.xy) + u.frame);
        return vec4(rand, 1f);
    }
  `;

  const weslSrc = { "./main.wesl": src };
  const result = await expectNoLogAsync(async () =>
    link({ weslSrc, rootModuleName: "./main.wesl", libs: [rand] }),
  );
  expect(result.dest).toContain("fn pcg_2u_3f");
  expect(result.dest).not.toContain("sinRand");
});

test("import from multi_pkg/second", async () => {
  const main = `
    import multi_pkg::second::two;

    @compute @workgroupSize(1)
    fn main() {
      two();
    }
  `;
  const weslSrc = { main };
  const result = await expectNoLogAsync(async () =>
    link({ weslSrc, libs: [second] }),
  );
  expect(result.dest).toContain("fn two()");
});

test("import from multi_pkg/transitive", async () => {
  const main = `
    import multi_pkg::transitive::toDep;

    @compute @workgroupSize(1)
    fn main() {
      toDep();
    }
  `;
  const weslSrc = { main };
  const result = await expectNoLogAsync(async () =>
    link({ weslSrc, libs: [trans] }),
  );
  expect(result.dest).toContain("fn toDep()");
  expect(result.dest).toContain("fn dep()");
});
