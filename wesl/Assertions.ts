/** checks whether a condition is true, otherwise throws */
export function assertThat(
  condition: unknown,
  msg?: string,
): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
}
export function assertUnreachable(value: never): never {
  throw new ErrorWithData("Unreachable value", { data: value });
}

export interface ErrorWithDataOptions<T> extends ErrorOptions {
  data: T;
}

export class ErrorWithData<T> extends Error {
  data?: T;
  constructor(message?: string, options?: ErrorWithDataOptions<T>) {
    super(message, options);
    this.data = options?.data;
  }
}
