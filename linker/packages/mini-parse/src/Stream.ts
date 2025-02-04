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
  /** Returns the next token, or `null` if the end of the stream has been reached */
  nextToken(): T | null;
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

/**
 * Legacy interface, will be replaced with a better mechanism
 */
export interface StreamWithLocation {
  previousTokenEnd(): number;
  currentTokenStart(): number;
}
