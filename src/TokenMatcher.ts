export interface Token {
  kind: string;
  text: string;
}

type FullTokenMatcher<T> = TokenMatcher & {
  [Property in keyof T]: string;
};

export interface TokenMatcher {
  start(src: string, position?: number): void;
  next(): Token | undefined;
  position(position?: number): number;
  _traceName?: string;
}

/** size limited key value cache */
class Cache<K, V> extends Map<K, V> {
  constructor(readonly maxSize: number) {
    super();
  }

  set(k: K, v: V): this {
    if (this.size > this.maxSize) {
      this.delete(this.keys().next().value);
    }
    return super.set(k, v);
  }
}

export function tokenMatcher<T extends Record<string, string | RegExp>>(
  matchers: T,
  traceName = "matcher"
): FullTokenMatcher<T> {
  const groups: string[] = Object.keys(matchers);
  let src: string;
  // cache of tokens by position, so we don't have to reparse after backtracking
  const cache = new Cache<number, Token>(5);
  const expParts = Object.values(matchers).map(toRegexSource).join("|");
  const exp = new RegExp(expParts, "midg");

  function start(text: string, position: number = 0): void {
    if (src !== text) {
      console.log(`${traceName} start, clear cache`);
      cache.clear();
    }
    src = text;
    exp.lastIndex = position;
  }

  function next(): Token | undefined {
    if (src === undefined) {
      throw new Error("start() first");
    }
    const startPos = exp.lastIndex;
    const found = cache.get(startPos);
    if (found) {
      console.log(`${traceName} cache hit`, found)
      exp.lastIndex += found.text.length;
      return found;
    }

    const matches = exp.exec(src);
    const matchedIndex = findGroupDex(matches?.indices);
    if (matchedIndex) {
      const { startEnd, groupDex } = matchedIndex;
      const kind = groups[groupDex];
      const text = src.slice(startEnd[0], startEnd[1]);
      const token = { kind, text };
      cache.set(startPos, token);
      console.log(`${traceName} cache miss`, startPos, token )
      return token;
    }
  }

  function position(pos?: number): number {
    if (pos) {
      exp.lastIndex = pos;
    }
    return exp.lastIndex;
  }

  const keyEntries = groups.map((k) => [k, k]);
  const keys = Object.fromEntries(keyEntries);
  return {
    ...keys,
    start,
    next,
    position,
    _traceName: traceName,
  } as FullTokenMatcher<T>;
}

interface MatchedIndex {
  startEnd: [number, number];
  groupDex: number;
}

function findGroupDex(
  indices: RegExpIndicesArray | undefined
): MatchedIndex | undefined {
  if (indices) {
    for (let i = 1; i < indices.length; i++) {
      const startEnd = indices[i];
      if (startEnd) {
        return { startEnd, groupDex: i - 1 };
      }
    }
  }
}

function toRegexSource(e: RegExp | string): string {
  if (typeof e === "string") {
    return `(${escapeRegex(e)})`;
  } else {
    return `(${e.source})`;
  }
}

const regexSpecials = /[$+*.?|(){}[\]\\/^]/g;

export function escapeRegex(s: string): string {
  return s.replace(regexSpecials, "\\$&");
}
