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

export function assertUnreachable(value: never): never {
  throw new ErrorWithData("Unreachable value", { data: value });
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
