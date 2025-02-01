export function assert(condition: any, msg?: string): asserts condition {
  if (!condition) {
    throw new Error(msg);
  }
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
