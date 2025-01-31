import { Stream, StreamWithLocation, Token } from "../Stream";

export class PeekStream<T extends Token>
  implements Stream<T>, StreamWithLocation
{
  private previousLocation: number = 0;
  private peekedToken: T | null;
  constructor(private inner: Stream<T>) {
    this.peekedToken = inner.nextToken();
  }
  checkpoint(): number {
    return this.inner.checkpoint();
  }
  reset(position: number): void {
    return this.inner.reset(position);
  }
  nextToken(): T | null {
    const token = this.peekedToken;
    if (token === null) return null;
    this.peekedToken = this.inner.nextToken();
    return token;
  }
  peekToken(): T | null {
    return this.peekedToken;
  }
  previousTokenEnd(): number {
    return this.previousLocation;
  }
  currentTokenStart(): number {
    return this.peekedToken?.span[0] ?? this.previousLocation;
  }
}
