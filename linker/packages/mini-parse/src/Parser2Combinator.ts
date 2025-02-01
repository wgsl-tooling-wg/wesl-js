import { AnyParser2, Parser2, ParserResult, ParserTraceInfo } from "./Parser";
import { tracing } from "./ParserTracing";
import { Stream, StringToken, Token } from "./Stream";

export function tryToken<Kind extends string>(
  kind: Kind,
  value?: string | string[],
) {
  if (value === undefined) {
    return new TokenKindParser(kind, true as const);
  } else if (Array.isArray(value)) {
    return new TokenValuesParser(kind, true as const, value);
  } else {
    return new TokenValueParser(kind, true as const, value);
  }
}

export function token<Kind extends string>(
  kind: Kind,
  value?: string | string[],
) {
  if (value === undefined) {
    return new TokenKindParser(kind, false as const);
  } else if (Array.isArray(value)) {
    return new TokenValuesParser(kind, false as const, value);
  } else {
    return new TokenValueParser(kind, false as const, value);
  }
}

abstract class TokenParser<Kind extends string, B> extends Parser2<
  Stream<StringToken<Kind>>,
  StringToken<Kind>,
  B
> {
  constructor(
    public kind: Kind,
    public canBacktrack: B,
  ) {
    super();
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("token", []);
      this._traceInfo.traceIsTerminal = true;
    }
  }
  abstract valueCheck(resultValue: string): boolean;
  abstract valueString(): string;
  parseNext<Kind2 extends string>(
    input: Stream<StringToken<Kind2>>,
  ): ParserResult<StringToken<Kind & Kind2>> | null {
    const result = input.nextToken();
    if (result === null) {
      if (this.canBacktrack) return null;
      ParseError.throwEof();
    }
    if (this.kind !== (result.kind as string)) {
      if (this.canBacktrack) return null;
      ParseError.throwExpected("kind " + this.kind, result.kind);
    }
    if (!this.valueCheck(result.value)) {
      if (this.canBacktrack) return null;
      ParseError.throwExpected(this.valueString(), result.kind);
    }
    return { value: result as any };
  }
}

class TokenKindParser<Kind extends string, B> extends TokenParser<Kind, B> {
  constructor(kind: Kind, canBacktrack: B) {
    super(kind, canBacktrack);
  }
  valueCheck(_resultValue: string): boolean {
    return true;
  }
  valueString(): string {
    return "any";
  }
}
class TokenValueParser<Kind extends string, B> extends TokenParser<Kind, B> {
  constructor(
    kind: Kind,
    canBacktrack: B,
    public value: string,
  ) {
    super(kind, canBacktrack);
  }
  valueCheck(resultValue: string): boolean {
    return this.value === resultValue;
  }
  valueString(): string {
    return "value " + this.value;
  }
}
class TokenValuesParser<Kind extends string, B> extends TokenParser<Kind, B> {
  constructor(
    kind: Kind,
    canBacktrack: B,
    public values: string[],
  ) {
    super(kind, canBacktrack);
  }
  valueCheck(resultValue: string): boolean {
    return this.values.includes(resultValue);
  }
  valueString(): string {
    return "values " + this.values.join(",");
  }
}

type ResultFromArg<A> = A extends Parser2<any, infer O, any> ? O : never;

type SeqValues<P extends AnyParser2[]> = {
  [key in keyof P]: ResultFromArg<P[key]>;
};
export function seq<I, O1, B, P extends Parser2<I, any, false>[]>(
  first: Parser2<I, O1, B>,
  ...parsers: P
): Parser2<I, [O1, ...SeqValues<P>], B> {
  return new SeqParser(first, parsers, first.canBacktrack);
}

class SeqParser<I, O, B> extends Parser2<I, O, B> {
  constructor(
    public first: Parser2<I, any, B>,
    public rest: Parser2<I, any, false>[],
    public canBacktrack: B,
  ) {
    super();
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("seq", [first, ...rest]);
    }
  }
  parseNext(input: I): ParserResult<O> | null {
    const result1 = this.first.parseNext(input);
    if (result1 === null) return null;

    const result = [result1.value];
    for (const p of this.rest) {
      const resultNext = p.parseNext(input);
      if (resultNext === null) {
        ParseError.throwMissingParserResult();
      }
      result.push(resultNext.value);
    }
    return { value: result as any };
  }
}

// TODO: span
// TODO: or
// TODO: map
// TODO: yes, no
// TODO: opt = or(foo, yes)
// TODO: preceded, terminated, delimited = seq
// TODO: withSep, withSepPlus
// TODO: peek
// TODO: any
// TODO: not
// TODO: repeat, repeatPlus,
// TODO: eof

// type Subset<L, R> = R extends L ? L : never;

export class ParseError extends Error {
  constructor(msg?: string) {
    super(msg);
  }
  static throwEof(): never {
    throw new ParseError("Token expected, but EOF reached");
  }
  static throwMissingParserResult(): never {
    throw new ParseError("Parser result expected, but none got.");
  }
  static throwExpected(expected: any, actual: any): never {
    throw new ParseError(`Expected ${expected}, but got ${actual}`);
  }
}
