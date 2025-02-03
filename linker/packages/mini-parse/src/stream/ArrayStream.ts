import { Stream, Token } from "../Stream";

export interface ArrayToken<T> extends Token {
  kind: "";
  value: T;
}

export class ArrayStream<T> implements Stream<ArrayToken<T>> {
  private index = 0;
  constructor(public values: T[]) {}
  checkpoint(): number {
    return this.index;
  }
  reset(position: number): void {
    this.index = position;
  }
  nextToken(): ArrayToken<T> | null {
    if (this.index >= this.values.length) {
      return null;
    }
    const token: ArrayToken<T> = {
      kind: "",
      value: this.values[this.index],
      span: [this.index, this.index + 1],
    };
    this.index += 1;
    return token;
  }
}
