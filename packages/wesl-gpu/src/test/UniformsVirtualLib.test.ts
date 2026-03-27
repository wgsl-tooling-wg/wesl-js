import { expect, test } from "vitest";
import { link, RecordResolver } from "wesl";
import { scanUniforms } from "../UniformsVirtualLib.ts";

test("default uniforms scan and link", async () => {
  const src = `
    import env::u;
    fn vs() -> vec4f { return vec4f(0); }
    @fragment fn main() -> @location(0) vec4f {
      return vec4f(u.resolution, u.time, 1.0);
    }
  `;
  const scan = scanUniforms(src);
  expect(scan.layout).toBeNull();
  expect(scan.virtualLibs.env).toBeDefined();

  const resolver = new RecordResolver({ "./main.wesl": src });
  const result = await link({
    resolver,
    rootModuleName: "main",
    virtualLibs: scan.virtualLibs,
  });
  expect(result.dest).toContain("resolution");
  expect(result.dest).toContain("time");
});

test("custom @uniforms scan, layout, and link", async () => {
  const src = `
    import env::u;
    @uniforms struct MyUniforms {
      @auto resolution: vec2f,
      @auto time: f32,
      @range(0.0, 10.0, 5.0) speed: f32,
    }
    fn vs() -> vec4f { return vec4f(0); }
    @fragment fn main() -> @location(0) vec4f {
      return vec4f(u.resolution, u.speed, 1.0);
    }
  `;
  const scan = scanUniforms(src, "package::main");
  const layout = scan.layout!;
  expect(layout.structName).toBe("MyUniforms");
  expect(layout.controls).toHaveLength(1);
  expect(layout.controls[0].kind).toBe("range");
  expect(layout.fields).toHaveLength(2);
  expect(layout.layout.bufferSize).toBe(16);
  expect(layout.fields[0]).toMatchObject({ name: "resolution", offset: 0 });
  expect(layout.fields[1]).toMatchObject({ name: "time", offset: 8 });
  expect(layout.controls[0]).toMatchObject({ name: "speed", offset: 12 });

  const resolver = new RecordResolver({ "./main.wesl": src });
  const result = await link({
    resolver,
    rootModuleName: "main",
    virtualLibs: scan.virtualLibs,
  });
  expect(result.dest).toContain("MyUniforms");
  expect(result.dest).toContain("resolution");
  expect(result.dest).toContain("speed");
});
