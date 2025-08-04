/** checks whether a condition is true, otherwise throws */
export function assertThat(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}
export function assertUnreachable(value: never): never {
  throw new ErrorWithData("Unreachable value", { data: value });
}

/** @public */
export interface ErrorWithDataOptions extends ErrorOptions {
  data: any;
}

/** @public */
export class ErrorWithData extends Error {
  data: any;
  constructor(message?: string, options?: ErrorWithDataOptions) {
    super(message, options);
    this.data = options?.data;
  }
}
