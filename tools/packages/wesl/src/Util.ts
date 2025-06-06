import type { Span } from "mini-parse";

export function multiKeySet<A, B, V>(
  m: Map<A, Map<B, V>>,
  a: A,
  b: B,
  v: V,
): void {
  const bMap = m.get(a) || new Map();
  m.set(a, bMap);
  bMap.set(b, v);
}

const tokenRegex = /\b(\w+)\b/gi;
/** replace strings in a text according to a relacement map
 * replaced strings must be 'tokens', surrounded by spaces or punctuation
 */
export function replaceWords(
  text: string,
  replace: Record<string, string>,
): string {
  return text.replaceAll(tokenRegex, s => (s in replace ? replace[s] : s));
}

/** return an array partitioned into possibly overlapping groups */
export function grouped<T>(a: T[], size: number, stride = size): T[][] {
  const groups = [];
  for (let i = 0; i < a.length; i += stride) {
    groups.push(a.slice(i, i + size));
  }
  return groups;
}

/** group an array into subarrays by a key function */
export function groupBy<T, K>(a: T[], key: (t: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const t of a) {
    const k = key(t);
    const group = groups.get(k) || [];
    group.push(t);
    groups.set(k, group);
  }
  return groups;
}

/** partition an array into two parts by a discriminator function */
export function partition<T>(a: T[], partFn: (t: T) => boolean): [T[], T[]] {
  const yesPart: T[] = [];
  const noPart: T[] = [];
  for (const t of a) {
    if (partFn(t)) yesPart.push(t);
    else noPart.push(t);
  }
  return [yesPart, noPart];
}

/** run an carrying function over every element in an array,
 * i.e. an inclusive prefix scan */
export function scan<T, U>(array: T[], fn: (a: T, b: U) => U, zero: U): U[] {
  const result = [zero];

  let current = zero;
  for (let i = 0; i < array.length; i++) {
    current = fn(array[i], current);
    result.push(current);
  }
  return result;
}

/** return a new record by replacing values in 'a' with 'b' as a map.
 * values in 'a' that are not in 'b' are unchanged.
 * e.g. {a: "b", x: 9}, {b: 1} yields {a: 1, x: 9}
 */
export function mapForward(
  a: Record<string, string>,
  b: Record<string, any>,
): Record<string, any> {
  const combined = Object.entries(a).map(([key, value]) => {
    const mappedValue = value in b ? b[value] : value;
    return [key, mappedValue];
  });
  return Object.fromEntries(combined);
}

/** return the last element of an array or undefined */
export function last<T>(a: T[]): T | undefined {
  return a[a.length - 1];
}

/**
 * Overlap two arrays, returning the tail of b if a is a prefix of b.
 * Otherwise, return undefined.
 */
export function overlapTail<T>(a: T[], b: T[]): T[] | undefined {
  let overlapSize = Math.min(a.length, b.length);

  while (overlapSize > 0) {
    const suffix = a.slice(-overlapSize);
    const prefix = b.slice(0, overlapSize);
    if (arrayEquals(suffix, prefix)) {
      break;
    } else {
      overlapSize--;
    }
  }

  if (overlapSize) {
    return b.slice(overlapSize);
  }
}

function arrayEquals(a: any[], b: any[]): boolean {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}

/** filter an array, returning the truthy results of the filter function */
export function filterMap<T, U>(arr: T[], fn: (t: T) => U | undefined): U[] {
  const out: U[] = [];
  for (const t of arr) {
    const u = fn(t);
    if (u) out.push(u);
  }
  return out;
}

/** filters an array, returns the first truthy result of the filter function */
export function findMap<T, U>(
  arr: T[],
  fn: (t: T) => U | undefined,
): U | undefined {
  for (const t of arr) {
    const u = fn(t);
    if (u) return u;
  }
  return undefined;
}

/** Run a function over the values in a Record
 * @return a new Record with mapped values.  */
export function mapValues<T, U>(
  obj: Record<string, T>,
  fn: (v: T) => U,
): Record<string, U> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
}

/**
 * Maps an character position in a string to a 1-indexed line number, and 1-indexed column.
 */
export function offsetToLineNumber(
  offset: number,
  text: string,
): [lineNum: number, linePos: number] {
  const safeOffset = Math.min(text.length, Math.max(0, offset));
  let lineStartOffset = 0;
  let lineNum = 1;
  while (true) {
    // LATER: Does this "line break" actually match the spec? I think not
    const lineEnd = text.indexOf("\n", lineStartOffset);
    if (lineEnd === -1 || safeOffset <= lineEnd) {
      // Last relevant line
      const linePos = 1 + (safeOffset - lineStartOffset);
      return [lineNum, linePos];
    } else {
      // Go to the next line
      lineStartOffset = lineEnd + 1;
      lineNum += 1;
    }
  }
}

/** Highlights an error.
 *
 * Returns a string with the line, and a string with the ^^^^ carets
 */
export function errorHighlight(source: string, span: Span): [string, string] {
  let lineStartOffset = source.lastIndexOf("\n", span[0]);
  if (lineStartOffset === -1) {
    lineStartOffset = 0;
  }
  let lineEndOffset = source.indexOf("\n", span[0]);
  if (lineEndOffset === -1) {
    lineEndOffset = source.length;
  }

  // LATER Handle multiline spans
  const errorLength = span[1] - span[0];
  const caretCount = Math.max(1, errorLength);
  const linePos = span[0] - lineStartOffset;
  return [
    source.slice(lineStartOffset, lineEndOffset),
    " ".repeat(linePos) + "^".repeat(caretCount),
  ];
}
