import { Span } from "../Span.ts";
import { Stream, Token } from "../Stream.ts";
import { toRegexSource } from "./RegexHelpers.ts";

export interface StringToken<Kind extends string> extends Token {
  kind: Kind;
  value: string;
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

  execAt(text: string, position: number): StringToken<Kind> | null {
    this.exp.lastIndex = position;
    const matches = this.exp.exec(text);
    const matchedIndex = findGroupDex(matches?.indices);

    if (matchedIndex) {
      const { span, groupDex } = matchedIndex;
      const kind = this.groups[groupDex];
      const value = text.slice(span[0], span[1]);
      return {
        kind,
        span,
        value,
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

export class MatchersStream<Kind extends string>
  implements Stream<StringToken<Kind>>
{
  private position: number = 0;
  constructor(
    public text: string,
    private matchers: RegexMatchers<Kind>,
  ) {}
  eofOffset(): number {
    return Math.max(0, this.text.length - this.position);
  }
  checkpoint(): number {
    return this.position;
  }
  reset(position: number): void {
    this.position = position;
  }
  nextToken(): StringToken<Kind> | null {
    const result = this.matchers.execAt(this.text, this.position);
    if (result === null) return null;
    this.position = result.span[1];
    return result;
  }
}
