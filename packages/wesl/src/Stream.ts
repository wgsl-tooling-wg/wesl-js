import type { Span } from "./Span.ts";

/**
 * Interface for a tokenizer. Returns a "next token", and can be reset to
 * previously saved positions (checkpoints).
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
  /** src text */
  src: string;
}

/** A text token */
export interface Token {
  kind: string;
  text: string;
  span: Span;
}

export interface TypedToken<Kind extends string> extends Token {
  kind: Kind;
}
