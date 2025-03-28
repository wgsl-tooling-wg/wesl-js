// deno-lint-ignore-file no-explicit-any
/// <reference types="npm:@webgpu/types" />
import { SrcMap } from "@wesl/mini-parse";
import { expect } from "@std/expect";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { LinkedWesl } from "../LinkedWesl.ts";
import { makeWeslDevice } from "../WeslDevice.ts";

class MockedGPUDevice {
  constructor(overrideFns: Partial<GPUDevice>) {
    for (const [key, value] of Object.entries(overrideFns)) {
      (this as any)[key] = value;
    }
  }
}

Deno.test("WeslDevice doesn't conflict with uncapturederror", async () => {
  let errorListener: EventListener;
  const device = makeWeslDevice(
    new MockedGPUDevice({
      createShaderModule: () => {
        const errorEvent: Partial<GPUUncapturedErrorEvent> = {
          error: {
            message: "shader compilation failed",
          },
          defaultPrevented: false,
        };
        errorListener(errorEvent as any);
        return {} as any;
      },
      addEventListener: (type: string, listener: EventListener) => {
        expect(type).toBe("uncapturederror");
        errorListener = listener;
      },
    }) as any,
  );

  const errorPromise = new Promise<GPUError>((resolve, reject) => {
    const TIMEOUT = setTimeout(() => {
      reject();
    }, 1000);
    device.addEventListener("uncapturederror", (ev) => {
      clearTimeout(TIMEOUT);
      resolve(ev.error);
    });
  });
  device.createShaderModule({
    code: "🐈",
  });

  const error = await errorPromise;

  expect(error.message).toBe("shader compilation failed");
});

Deno.test("WeslDevice doesn't conflict with popErrorsScope", async () => {
  const device = makeWeslDevice(
    new MockedGPUDevice({
      createShaderModule: () => {
        return {} as any;
      },
      pushErrorScope: () => {},
      popErrorScope: () => {
        return Promise.resolve({
          message: ":1:1 shader compilation failed",
        });
      },
    }) as any,
  );
  using createShaderModuleSpy = spy(device, "createShaderModule");
  device.pushErrorScope("validation");
  device.createShaderModule({
    code: "🐈",
  });
  const errorPromise = new Promise<GPUError | null>((resolve, reject) => {
    const TIMEOUT = setTimeout(() => {
      reject();
    }, 1000);
    device.popErrorScope().then((v) => {
      clearTimeout(TIMEOUT);
      resolve(v);
    });
  });

  const error = await errorPromise;

  expect(error).not.toBe(null);
  expect(error?.message).toContain("shader compilation failed");
  expect(error?.message).toContain(":1:1");
  assertSpyCalls(createShaderModuleSpy, 1);
});

Deno.test("LinkedWesl createShaderModule skips if it's not a WeslDevice", () => {
  const device: GPUDevice = new MockedGPUDevice({
    createShaderModule: () => {
      return {} as any;
    },
    createRenderPipeline: () => {
      return null as any;
    },
  }) as any;

  using createShaderModuleSpy = spy(device, "createShaderModule");
  const linkedWesl = new LinkedWesl(
    new SrcMap(
      {
        text: "cute generated code",
      },
      [],
    ),
  );

  // Test that this doesnt' throw
  linkedWesl.createShaderModule(device, {});
  assertSpyCalls(createShaderModuleSpy, 1);
});

Deno.test("Point at WESL code", async () => {
  const GPUDeviceMock = spy(function (this: GPUDevice) {
    this.createShaderModule = () => {
      return {
        getCompilationInfo(): Promise<GPUCompilationInfo> {
          return Promise.resolve({
            __brand: "GPUCompilationInfo",
            messages: [
              {
                __brand: "GPUCompilationMessage",
                type: "error",
                offset: 0,
                length: 4,
                lineNum: 1,
                linePos: 1,
                message: "shader compilation failed",
              },
            ],
          });
        },
      } as any;
    };
    this.pushErrorScope = () => {};
    this.popErrorScope = () => {
      return Promise.resolve({
        message: "this message gets ignored",
      });
    };
    this.dispatchEvent = () => {
      throw new Error("Should not be called");
    };
  });
  const device = makeWeslDevice(new (GPUDeviceMock as any)());

  const linkedWesl = new LinkedWesl(
    new SrcMap(
      {
        text: "cute generated code",
      },
      [
        {
          src: {
            text: "\ncute source code",
            path: "main.wesl",
          },
          // Point at start of line 2
          srcStart: 1,
          srcEnd: 11,
          destStart: 0,
          destEnd: 10,
        },
      ],
    ),
  );

  device.pushErrorScope("validation");
  linkedWesl.createShaderModule(device, {});
  const result = await device.popErrorScope();

  // Expect that it's not the original, but instead the changed version
  expect(result?.message).not.toContain("this message gets ignored");
  expect(result?.message).not.toContain(":1:1");
  expect(result?.message).toContain(":2:1");
  expect(result?.message).toContain("shader compilation failed");
});

Deno.test("Invokes error throwing", async () => {
  const dispatchEventPromise = Promise.withResolvers();
  const dispatchEventTimer = setTimeout(() => {
    dispatchEventPromise.reject();
  }, 500);
  const device = makeWeslDevice(
    new MockedGPUDevice({
      createShaderModule: () => {
        return {
          getCompilationInfo(): Promise<GPUCompilationInfo> {
            return Promise.resolve({
              __brand: "GPUCompilationInfo",
              messages: [
                {
                  __brand: "GPUCompilationMessage",
                  type: "error",
                  offset: 1,
                  length: 4,
                  lineNum: 1,
                  linePos: 2,
                  message: "shader compilation failed",
                },
              ],
            });
          },
        } as any;
      },
      pushErrorScope: () => {},
      popErrorScope: () => {
        return Promise.resolve({
          message: "this message gets ignored",
        });
      },
      addEventListener: () => {},
      dispatchEvent: () => {
        clearTimeout(dispatchEventTimer);
        dispatchEventPromise.resolve(true);
        return true;
      },
    }) as any,
  );
  using dispatchEventSpy = spy(device, "dispatchEvent");
  using injectErrorSpy = spy(device, "injectError");

  const linkedWesl = new LinkedWesl(
    new SrcMap({
      text: "cute generated code",
    }),
  );

  linkedWesl.createShaderModule(device, {});

  assertSpyCalls(injectErrorSpy, 1);

  await dispatchEventPromise.promise;
  assertSpyCalls(dispatchEventSpy, 1);
});

// LATER
// Test injecterror
// Test mapGPUCompilationInfo
