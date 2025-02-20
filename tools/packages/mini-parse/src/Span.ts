/**
 * An range, from start (inclusive) to end (exclusive).
 */
export type Span = readonly [number, number];

export function isSpan(span: any): span is Span {
  return Array.isArray(span) && span.length === 2;
}
