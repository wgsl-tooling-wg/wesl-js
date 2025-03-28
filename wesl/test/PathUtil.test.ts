import { expect } from "@std/expect";
import { normalize } from "../PathUtil.ts";

// ../../../lib/webgpu-samples/src/anim/anim.wgsl

Deno.test("normalize ./foo", () => {
  const n = normalize("./foo");
  expect(n).toBe("foo");
});

Deno.test("normalize ./foo/./", () => {
  const n = normalize("./foo/./");
  expect(n).toBe("foo");
});

Deno.test("normalize foo/bar/..", () => {
  const n = normalize("foo/bar/..");
  expect(n).toBe("foo");
});

Deno.test("normalize ./foo/bar/../.", () => {
  const n = normalize("./foo/bar/../.");
  expect(n).toBe("foo");
});

Deno.test("normalize ../foo", () => {
  const n = normalize("../foo");
  expect(n).toBe("../foo");
});

Deno.test("normalize ../../foo", () => {
  const n = normalize("../../foo");
  expect(n).toBe("../../foo");
});
