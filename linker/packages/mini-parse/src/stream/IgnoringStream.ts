import { Stream, Token } from "../Stream.ts";

export class IgnoringStream<T extends Token> implements Stream<T> {
  constructor(
    private inner: Stream<T>,
    private ignoreFn: (token: Token) => boolean,
  ) {}
  checkpoint(): number {
    return this.inner.checkpoint();
  }
  reset(position: number): void {
    this.inner.reset(position);
  }
  nextToken(): T | null {
    while (true) {
      const token = this.inner.nextToken();
      if (token === null || !this.ignoreFn(token)) {
        return token;
      }
    }
  }
}
