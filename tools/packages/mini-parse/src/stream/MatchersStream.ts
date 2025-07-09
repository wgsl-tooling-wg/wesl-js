import type { Span } from "../Span.ts";
import type { Stream, TypedToken } from "../Stream.ts";
import { toRegexSource } from "./RegexHelpers.ts";

/**
 * Runs a `RegexMatchers` on an input string
 */
export class MatchersStream<Kind extends string>
  implements Stream<TypedToken<Kind>>
{
  private position = 0;
  public text: string;
  private matchers: RegexMatchers<Kind>;

  constructor(text: string, matchers: RegexMatchers<Kind>) {
    this.text = text;
    this.matchers = matchers;
  }

  checkpoint(): number {
    return this.position;
  }
  reset(position: number): void {
    this.position = position;
  }
  nextToken(): TypedToken<Kind> | null {
    const result = this.matchers.execAt(this.text, this.position);
    if (result === null) return null;
    this.position = result.span[1];
    return result;
  }
  get src(): string {
    return this.text;
  }
}

/**
 * The matchers passed to this object must follow certain rules
 * - They must use non-capturing groups. `(?:...)`
 * - They must NOT use `^` or `$`
 */
export class RegexMatchers<Kind extends string> {
  private groups: Kind[];
  private exp: RegExp;
  constructor(matchers: Record<Kind, string | RegExp>) {
    this.groups = Object.keys(matchers) as Kind[];
    const expParts = Object.entries(matchers as Record<string, string | RegExp>)
      .map(toRegexSource)
      .join("|");
    // d = return substrings of each match
    // y = sticky, only match at the start of the string
    // u = unicode aware
    this.exp = new RegExp(expParts, "dyu");
  }

  execAt(text: string, position: number): TypedToken<Kind> | null {
    this.exp.lastIndex = position;
    const matches = this.exp.exec(text);
    const matchedIndex = findGroupDex(matches?.indices);

    if (matchedIndex) {
      const { span, groupDex } = matchedIndex;
      const kind = this.groups[groupDex];
      return {
        kind,
        span,
        text: text.slice(span[0], span[1]),
      };
    } else {
      return null;
    }
  }
}

interface MatchedIndex {
  span: Span;
  groupDex: number;
}

function findGroupDex(
  indices: RegExpIndicesArray | undefined,
): MatchedIndex | undefined {
  if (indices !== undefined) {
    for (let i = 1; i < indices.length; i++) {
      const span = indices[i];
      if (span !== undefined) {
        return { span, groupDex: i - 1 };
      }
    }
  }
}
