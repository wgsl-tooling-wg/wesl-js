/** checks whether a condition is true, otherwise throws */
export function assertThat(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

/**
 * Useful to validate that all cases are handled,
 * TypeScript should complain if this statement could possibly be executed.
 *
 * (It is not intended to execute at runtime.
 * Instead, the purpose is to trigger type checking to confirm that
 * we've handled every appropriate type.)
 */
export function assertUnreachable(_value: never): never {
  throw new Error("should be unreachable");
}
