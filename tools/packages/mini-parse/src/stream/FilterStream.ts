import type { Stream, Token } from "../Stream.ts";

/** Only lets tokens through that pass the filter */
export class FilterStream<T extends Token> implements Stream<T> {
  private inner: Stream<T>;
  /** Return true to keep a token */
  private filterFn: (token: Token) => boolean;
  constructor(inner: Stream<T>, filterFn: (token: Token) => boolean) {
    this.inner = inner;
    this.filterFn = filterFn;
  }
  checkpoint(): number {
    return this.inner.checkpoint();
  }
  reset(position: number): void {
    this.inner.reset(position);
  }
  nextToken(): T | null {
    while (true) {
      const token = this.inner.nextToken();
      if (token === null || this.filterFn(token)) {
        return token;
      }
    }
  }
  get src(): string {
    return this.inner.src;
  }
}
