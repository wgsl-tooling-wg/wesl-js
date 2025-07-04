/** return an array partitioned into possibly overlapping groups */
export function grouped<T>(a: T[], size: number, stride = size): T[][] {
  const groups = [];
  for (let i = 0; i < a.length; i += stride) {
    groups.push(a.slice(i, i + size));
  }
  return groups;
}

/** apply a map() on the values in a Record.
 * @return a new Record.  */
export function mapValues<K extends string | number | symbol, T, U>(
  obj: Record<K, T>,
  fn: (v: T) => U,
): Record<K, U> {
  const result = {} as Record<K, U>;
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      result[key] = fn(obj[key]);
    }
  }
  return result;
}
