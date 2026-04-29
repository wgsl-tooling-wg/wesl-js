/**
 * Runs a function with WebGPU error scopes, automatically handling push/pop/check.
 * JS errors from `fn` propagate unchanged. GPU errors (validation, OOM, internal)
 * are rethrown as `Error` with the original `GPUError` preserved as `.cause`.
 */
export async function withErrorScopes<T>(
  device: GPUDevice,
  fn: () => T | Promise<T>,
): Promise<T> {
  device.pushErrorScope("internal");
  device.pushErrorScope("out-of-memory");
  device.pushErrorScope("validation");

  let result: T | undefined;
  let jsError: unknown;
  try {
    result = await fn();
  } catch (e) {
    jsError = e;
  }

  const validationError = await device.popErrorScope();
  const oomError = await device.popErrorScope();
  const internalError = await device.popErrorScope();

  if (jsError) throw jsError;
  if (validationError) {
    throw new Error(`WebGPU validation error: ${validationError.message}`, {
      cause: validationError,
    });
  }
  if (oomError) {
    throw new Error(`WebGPU out-of-memory error: ${oomError.message}`, {
      cause: oomError,
    });
  }
  if (internalError) {
    throw new Error(`WebGPU internal error: ${internalError.message}`, {
      cause: internalError,
    });
  }
  return result as T;
}
