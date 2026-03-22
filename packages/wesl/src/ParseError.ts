import type { Span } from "./Span.ts";

export class ParseError extends Error {
  span: Span;
  constructor(msg: string, span: Span) {
    super(msg);
    this.span = span;
  }
}
