import { Span } from "./Span.ts";

/**
 * An interface for a tokenizer. Returns a "next token", and can be reset to previously saved positions (checkpoints).
 * Based on https://docs.rs/winnow/latest/winnow/stream/trait.Stream.html
 */
export interface Stream<T extends Token> {
  /** Returns the current position */
  checkpoint(): number;
  /** Restores a position */
  reset(position: number): void;
  /**
   * Returns the next token, or `null` if the end of the stream has been reached.
   * Always leaves `checkpoint` right after the token.
   */
  nextToken(): T | null;

  /** src text
   *
   * TODO: Remove this (move it into an extended stream type)
   */
  src: string;
}

/** A text token */
export interface Token {
  kind: string;
  text: string; // Could be extended to handle other data types as well.
  span: Span;
}

export interface TypedToken<Kind extends string> extends Token {
  kind: Kind;
}

export function peekToken<T extends Token>(stream: Stream<T>): T | null {
  const start = stream.checkpoint();
  const token = stream.nextToken();
  stream.reset(start);
  return token;
}
