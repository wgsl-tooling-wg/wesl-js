import { tracing } from "mini-parse";

/** checks whether a condition is true, otherwise throws */
export function assertThat(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}

/** when debug testing is enabled, checks whether a condition is true, otherwise throws */
export function assertThatDebug(
  condition: any,
  msg?: string,
): asserts condition {
  tracing && assertThat(condition, msg);
}

/**
 * Typescript will complain at compile time if it thinks this could be executed.
 * Useful to validate that all cases are handled.
 *
 * Does nothing at runtime.
 */
export function assertUnreachableSilent(_value: never): void {}

/**
 * Useful to validate that all cases are handled,
 * TypeScript should complain if this statement could possibly be executed.
 *
 * If this is somehow executed at runtime, throw an exception.
 */
export function assertUnreachable(value: never): never {
  throw new ErrorWithData("Unreachable value", { data: value }); // LATER optimize code size by reporting less in non debug builds
}

export interface ErrorWithDataOptions extends ErrorOptions {
  data: any;
}

export class ErrorWithData extends Error {
  data: any;
  constructor(message?: string, options?: ErrorWithDataOptions) {
    super(message, options);
    this.data = options?.data;
  }
}
