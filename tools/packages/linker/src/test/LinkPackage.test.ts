import { expectNoLog } from "mini-parse/test-util";
import lib from "random_wgsl";
import { expect, test } from "vitest";
import { link } from "../Linker.ts";

test("import rand() from a package", () => {
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
  const result = expectNoLog(() =>
    link({ weslSrc, rootModuleName: "./main.wesl", libs: [lib] }),
  );
  expect(result.dest).toContain("fn pcg_2u_3f");
  expect(result.dest).not.toContain("sinRand");
});
