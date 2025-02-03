import { Stream, StreamWithLocation, Token } from "../Stream";

export type PeekedToken<T> = {
  /** The next token in the stream */
  token: T;
  /** The checkpoint *after* the token */
  checkpoint: number;
};

export function peekStreamToken<T extends Token>(
  stream: Stream<T>,
): PeekedToken<T> | null {
  const start = stream.checkpoint();
  const token = stream.nextToken();
  if (token === null) return null;
  const checkpoint = stream.checkpoint();
  stream.reset(start);
  return { token, checkpoint };
}

// TODO: Check if the perf of this is any good, or if I should yeet it.
export class PeekStream<T extends Token>
  implements Stream<T>, StreamWithLocation
{
  private previousSpanEnd: number = 0;
  private peeked: PeekedToken<T> | null;
  constructor(private inner: Stream<T>) {
    this.peeked = peekStreamToken(inner);
  }
  checkpoint(): number {
    return this.inner.checkpoint();
  }
  reset(position: number): void {
    this.inner.reset(position);
    this.peeked = peekStreamToken(this.inner);
  }
  nextToken(): T | null {
    const peeked = this.peeked;
    if (peeked === null) return null;
    this.inner.reset(peeked.checkpoint);
    this.previousSpanEnd = peeked.token.span[1];
    this.peeked = peekStreamToken(this.inner);
    return peeked.token;
  }
  peekToken(): T | null {
    if (this.peeked === null) {
      return null;
    } else {
      return this.peeked.token;
    }
  }
  previousTokenEnd(): number {
    return this.previousSpanEnd;
  }
  currentTokenStart(): number {
    if (this.peeked === null) {
      /// EOF
      return this.previousSpanEnd;
    }

    return this.peeked.token.span[0];
  }
}
