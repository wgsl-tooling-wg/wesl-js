/**
 * Runs a function with WebGPU error scopes, automatically handling push/pop/check.
 * Throws if any validation, out-of-memory, or internal errors occur.
 */
export async function withErrorScopes<T>(
  device: GPUDevice,
  fn: () => T | Promise<T>,
): Promise<T> {
  device.pushErrorScope("internal");
  device.pushErrorScope("out-of-memory");
  device.pushErrorScope("validation");

  const result = await fn();

  const validationError = await device.popErrorScope();
  const oomError = await device.popErrorScope();
  const internalError = await device.popErrorScope();

  if (validationError) {
    throw new Error(`WebGPU validation error: ${validationError.message}`);
  }
  if (oomError) {
    throw new Error(`WebGPU out-of-memory error: ${oomError.message}`);
  }
  if (internalError) {
    throw new Error(`WebGPU internal error: ${internalError.message}`);
  }

  return result;
}
