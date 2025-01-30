import { Span } from "./Span.ts";
export { matchOneOf } from "./stream/RegexHelpers.ts";
export {
  RegexMatchers,
  MatchersStream,
  type StringToken,
} from "./stream/StringStream";
export { IgnoringStream } from "./stream/IgnoringStream.ts";
export { CachingStream } from "./stream/CachingStream.ts";

/** Based on https://docs.rs/winnow/latest/winnow/stream/trait.Stream.html */
export interface Stream<T extends Token> {
  /** Distance to the end of the input */
  eofOffset(): number;
  /** Returns the current position */
  checkpoint(): number;
  /** Restores a position */
  reset(position: number): void;
  /** Returns the next token, or `null` if the end of the stream has been reached */
  nextToken(): T | null;
}

export interface Token {
  kind: string;
  value: any;
  span: Span;
}
