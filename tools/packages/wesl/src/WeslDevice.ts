import { ExtendedGPUValidationError } from "./LinkedWesl.ts";

/**
 * We want the WebGPU compilation errors to point at WESL code.
 * The native facilities are `device.pushErrorScope`, `device.popErrorScope`
 * and `device.addEventListener("uncapturederror", (ev) => {})`
 *
 * So we track the error scopes.
 * Then, when creating a shader module from WESL code, we forcibly capture the errors.
 * And then re-emit them to the nearest validation error scope.
 * If there isn't one, we throw it as an uncapturederror
 */
type ErrorScope = {
  filter: GPUErrorFilter;
  errors: Promise<GPUError | null>[];
};

/**
 * A {@link GPUDevice} with extensions for WESL. Created with {@link makeWeslDevice}.
 * Used to make error reporting point at the orignal WESL sources.
 */
export interface WeslDevice extends GPUDevice {
  /**
   * Attaches an error to the current error scope (created by {@link GPUDevice.pushErrorScope}).
   * If there is no error scope, it reports the error as a `'uncapturederror'`
   */
  injectError(type: GPUErrorFilter, error: Promise<GPUError | null>): void;
}

/**
 * Mutates a {@link GPUDevice} for usage with WESL. Does not impact your existing code, wherever a {@link GPUDevice} can be used, a {@link WeslDevice} is also valid.
 *
 * WESL uses this to display errors pointing at the WESL source instead of pointing at generated code.
 */
export function makeWeslDevice(device: GPUDevice): WeslDevice {
  const errorScopeStack: ErrorScope[] = [];

  (device as WeslDevice).injectError = (type, error) => {
    const errorScope = errorScopeStack.findLast(v => v.filter === type);
    if (errorScope !== undefined) {
      errorScope.errors.push(error);
    } else {
      error.then(e => {
        if (e !== null) {
          dispatchError(e);
        }
      });
    }
  };

  function dispatchError(e: GPUError) {
    // If there's no scope, we throw an error through the WebGPU facilities
    // Only dispatching an error doesn't result in a browser log message, so we implement that ourselves
    // We also make sure to first go through the normal "uncapturederror" process. Since this is the last `addEventListener`, it will get called at the very end.
    device.addEventListener(
      "uncapturederror",
      ev => {
        if (!ev.defaultPrevented) {
          if ("compilationInfo" in ev.error) {
            const error = ev.error as ExtendedGPUValidationError;
            // A custom mode with clickable sources. Uses https://stackoverflow.com/a/79467192/3492994
            if (error.compilationInfo) {
              for (const message of error.compilationInfo.messages) {
                throwError({
                  url: message.module.url,
                  text: message.module.text ?? null,
                  lineNumber: message.lineNum,
                  error: message.type + ": " + message.message,
                });
              }
            } else {
              console.error(ev.error.message);
            }
          } else {
            console.error(ev.error.message);
          }
        }
      },
      {
        // This event listener should only happen for this event!
        once: true,
      },
    );
    device.dispatchEvent(
      new GPUUncapturedErrorEvent("uncapturederror", { error: e }),
    );
  }

  // Keep track of the error scopes so that we can inject our errors into them
  // Based on https://jsgist.org/?src=e3fb4659a668e00c69b03c82ec8f0ad1 from @greggman
  device.pushErrorScope = ((
    baseFn: GPUDevice["pushErrorScope"],
  ): GPUDevice["pushErrorScope"] => {
    return function (this: GPUDevice, filter: GPUErrorFilter) {
      errorScopeStack.push({
        filter,
        errors: [],
      });
      return baseFn.call(this, filter);
    };
  })(device.pushErrorScope);

  device.popErrorScope = ((
    baseFn: GPUDevice["popErrorScope"],
  ): GPUDevice["popErrorScope"] => {
    return function (this: GPUDevice) {
      // Get our custom error scope stack
      const errorScope = errorScopeStack.pop();
      if (errorScope === undefined) {
        // This can also happen when makeWeslDevice was called after a `pushErrorScope`
        throw new DOMException(
          "popErrorScope called on empty error scope stack",
          "OperationError",
        );
      }
      // Add the real error reporter
      errorScope.errors.push(baseFn.call(this));
      // And get the first error (not null)
      // LATER consider reporting *all* errors, and not just the first
      const errorPromise = Promise.all(errorScope.errors).then(
        values => values.find(v => v !== null) ?? null,
      );
      return errorPromise;
    };
  })(device.popErrorScope);

  return device as WeslDevice;
}

// Based on https://stackoverflow.com/questions/65274147/sourceurl-for-css
function throwError({
  url,
  text,
  lineNumber,
  error,
}: {
  url: string;
  text: string | null;
  lineNumber: number;
  error: any;
}) {
  // We need a source map mapping for each line, otherwise Firefox is unhappy.
  // First line is AAAA
  // Conveniently source map mappings are *relative* to the previous one.
  // So adding more lines is trivial
  let mappings = "AAAA" + ";AACA".repeat(lineNumber);
  // And this is what our source map looks like
  const sourceMap = {
    version: 3,
    file: null,
    sources: [url],
    sourcesContent: [text ?? null],
    names: [],
    mappings: mappings,
  };

  // So we make up some Javascript code with a proper line number and error throwing
  let generatedCode =
    "\n".repeat(lineNumber - 1) +
    "throw new Error(" +
    JSON.stringify(error + "") +
    ")";
  // And redirect it to WESL
  generatedCode +=
    "\n//# sourceMappingURL=data:application/json;base64," +
    btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
  generatedCode += "\n//# sourceURL=" + sourceMap.sources[0];

  // Run the error-throwing file
  eval(generatedCode);
}
