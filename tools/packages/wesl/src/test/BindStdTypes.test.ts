import { expect, test } from "vitest";
import { link } from "../Linker.ts";

test("bind standard types in local contexts", async () => {
  const result = await link({
    weslSrc: {
      "main.wesl": `
        struct Vertex { position: vec3f, normal: vec3f }
        const SCALE: vec4f = vec4f(0.1, 0.2, 0.3, 0.4);

        fn identity() -> mat3x3f {
          return mat3x3f(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0);
        }

        fn main() {
          let v = Vertex(vec3f(0.0), vec3f(1.0, 0.0, 0.0));
          let m = identity();
        }
      `,
    },
    rootModuleName: "main.wesl",
  });

  expect(result.dest).toContain("struct Vertex");
  expect(result.dest).toContain("vec3f");
  expect(result.dest).toContain("vec4f");
  expect(result.dest).toContain("mat3x3f");
  expect(result.dest).toContain("const SCALE");
});

test("bind types in @if conditionals", async () => {
  const result = await link({
    weslSrc: {
      "main.wesl": `
        @if(USE_VEC4)
        fn process() -> vec4f { return vec4f(1.0); }

        @if(USE_MAT)
        fn transform() -> mat4x4f { return mat4x4f(); }

        fn main() {
          let x = process();
          let y = transform();
        }
      `,
    },
    rootModuleName: "main.wesl",
    conditions: { USE_VEC4: true, USE_MAT: true },
  });

  expect(result.dest).toContain("vec4f");
  expect(result.dest).toContain("mat4x4f");
  expect(result.dest).toContain("fn process()");
  expect(result.dest).toContain("fn transform()");
});

test("bind types in cross-module imports with initializers", async () => {
  const result = await link({
    weslSrc: {
      "main.wesl": `
        import package::lib::SCALE;
        import package::lib::color;

        fn main() {
          let s = SCALE.x;
          let c = color.rgb;
        }
      `,
      "lib.wesl": `
        override SCALE: vec4f = vec4f(0.1, 0.2, 0.3, 0.4);
        var<private> color: vec4f = vec4f(1.0, 0.0, 0.0, 1.0);
      `,
    },
    rootModuleName: "main.wesl",
  });

  expect(result.dest).toContain("vec4f");
  expect(result.dest).toContain("override SCALE");
  expect(result.dest).toContain("var<private> color");
});

test("import function and struct from same module", async () => {
  const result = await link({
    weslSrc: {
      "main.wesl": `
        import package::space::bracketing::bracketing;
        import package::space::bracketing::BracketingResult;

        fn main() {
          let r: BracketingResult = bracketing(vec2f(1.0, 0.0));
        }
      `,
      "space/bracketing.wesl": `
        struct BracketingResult {
          vAxis0: vec2f,
          vAxis1: vec2f,
          blendAlpha: f32,
        }

        fn bracketing(dir: vec2f) -> BracketingResult {
          return BracketingResult(dir, dir, 0.5);
        }
      `,
    },
    rootModuleName: "main.wesl",
  });

  expect(result.dest).toContain("struct BracketingResult");
  expect(result.dest).toContain("fn bracketing");
});
