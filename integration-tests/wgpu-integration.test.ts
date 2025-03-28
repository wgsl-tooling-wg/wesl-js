import { assert } from "@std/assert";
import { expect } from "@std/expect";

// Blocked on https://github.com/denoland/deno/issues/28660
Deno.test.ignore("Pass WESL shader to WebGPU", async () => {
  const device = await navigator.gpu.requestAdapter().then((v) =>
    v?.requestDevice()
  );
  assert(device);

  const module = device.createShaderModule({
    code: `
      @fragment fn fs() -> @location(0) vec4f {
        return vec4f(1, 0, 0, 1);
      }
    `,
  });
  // Blocked on https://github.com/denoland/deno/issues/28660
  const noErrors = await module.getCompilationInfo();
  expect(noErrors.messages.filter((v) => v.type === "error")).toEqual([]);
});
