import { AnyParser2, Parser2, ParserResult, ParserTraceInfo } from "./Parser";
import { tracing } from "./ParserTracing";
import { Span } from "./Span";
import { Stream, StreamWithLocation, Token, TypedToken } from "./Stream";

export function makeTokenMatchers<
  I extends Stream<TypedToken<Kind, Value>>,
  Kind extends string,
  Value,
>() {
  /** tries to parse a token */
  function tryToken<Kind2 extends Kind>(
    kind: Kind2,
    value?: Value | Value[],
  ): Parser2<I, TypedToken<Kind & Kind2, Value>, true> {
    if (value === undefined) {
      return new TokenKindParser<any, Kind & Kind2, Value, true>(kind, true);
    } else if (Array.isArray(value)) {
      return new TokenValuesParser<any, Kind & Kind2, Value, true>(
        kind,
        true,
        value,
      );
    } else {
      return new TokenValueParser<any, Kind & Kind2, Value, true>(
        kind,
        true,
        value,
      );
    }
  }

  /** parses a token */
  function token<Kind2 extends Kind>(
    kind: Kind2,
    value?: Value | Value[],
  ): Parser2<I, TypedToken<Kind & Kind2, Value>, false> {
    if (value === undefined) {
      return new TokenKindParser<any, Kind & Kind2, Value, false>(kind, false);
    } else if (Array.isArray(value)) {
      return new TokenValuesParser<any, Kind & Kind2, Value, false>(
        kind,
        false,
        value,
      );
    } else {
      return new TokenValueParser<any, Kind & Kind2, Value, false>(
        kind,
        false,
        value,
      );
    }
  }

  /** yields true if parsing has reached the end of input */
  function eof(): Parser2<I, null, false> {
    return new EofParser(false);
  }
  /** yields true if parsing has reached the end of input */
  function tryEof(): Parser2<I, null, true> {
    return new EofParser(true);
  }
  return {
    token,
    tryToken,
    eof,
    tryEof,
  };
}

abstract class TokenParser<
  I extends Stream<TypedToken<Kind, Value>>,
  Kind extends string,
  Value,
  const B,
> extends Parser2<I, TypedToken<Kind, Value>, B> {
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
  abstract valueCheck(resultValue: Value): boolean;
  abstract valueString(): string;
  parseNext(input: I): ParserResult<TypedToken<Kind, Value>> | null {
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

class TokenKindParser<
  I extends Stream<TypedToken<Kind, Value>>,
  Kind extends string,
  Value,
  const B,
> extends TokenParser<I, Kind, Value, B> {
  constructor(kind: Kind, canBacktrack: B) {
    super(kind, canBacktrack);
  }
  valueCheck(_resultValue: Value): boolean {
    return true;
  }
  valueString(): string {
    return "any";
  }
}
class TokenValueParser<
  I extends Stream<TypedToken<Kind, Value>>,
  Kind extends string,
  Value,
  const B,
> extends TokenParser<I, Kind, Value, B> {
  constructor(
    kind: Kind,
    canBacktrack: B,
    public value: Value,
  ) {
    super(kind, canBacktrack);
  }
  valueCheck(resultValue: Value): boolean {
    return this.value === resultValue;
  }
  valueString(): string {
    return "value " + this.value;
  }
}
class TokenValuesParser<
  I extends Stream<TypedToken<Kind, Value>>,
  Kind extends string,
  Value,
  const B,
> extends TokenParser<I, Kind, Value, B> {
  constructor(
    kind: Kind,
    canBacktrack: B,
    public values: Value[],
  ) {
    super(kind, canBacktrack);
  }
  valueCheck(resultValue: Value): boolean {
    return this.values.includes(resultValue);
  }
  valueString(): string {
    return "values " + this.values.join(",");
  }
}

class EofParser<I extends Stream<Token>, const B> extends Parser2<I, null, B> {
  constructor(public canBacktrack: B) {
    super();
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("eof");
    }
  }
  parseNext(input: I): ParserResult<null> | null {
    const start = input.checkpoint();
    const result = input.nextToken();
    if (result !== null) {
      if (this.canBacktrack) {
        input.reset(start);
        return null;
      } else {
        throw new ParseError("EOF reached");
      }
    }
    return {
      value: null,
    };
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

// TODO: Bespoke impls
/** Parse three values, and only keep the middle value
 * @return the second value, or null if any parser fails */
export function delimited<I, B, P extends Parser2<I, any, false>>(
  ignored1: Parser2<I, any, B>,
  parser: P,
  ignored2: Parser2<I, any, false>,
): Parser2<I, ResultFromArg<P>, B> {
  return seq(ignored1, parser, ignored2).map(v => v[1]);
}

/** Parse two values, and discard the first value
 * @return the second value, or null if any parser fails */
export function preceded<I, B, P extends Parser2<I, any, false>>(
  ignored: Parser2<I, any, B>,
  parser: P,
): Parser2<I, ResultFromArg<P>, B> {
  return seq(ignored, parser).map(v => v[1]);
}
/** Parse two values, and discard the second value
 * @return the first value, or null if any parser fails */
export function terminated<I, B, P extends Parser2<I, any, B>>(
  parser: P,
  ignored: Parser2<I, any, false>,
): Parser2<I, ResultFromArg<P>, B> {
  return seq(parser, ignored).map(v => v[0]);
}

type OrValues<P extends AnyParser2[]> = ResultFromArg<P[number]>;

export function or<I extends Stream<any>, P extends Parser2<I, any, true>[]>(
  ...parsers: P
): Parser2<I, OrValues<P>, false> {
  return new OrParser(parsers, false);
}
export function tryOr<I extends Stream<any>, P extends Parser2<I, any, true>[]>(
  ...parsers: P
): Parser2<I, OrValues<P>, true> {
  return new OrParser(parsers, true);
}

class OrParser<I extends Stream<any>, O, const B> extends Parser2<I, O, B> {
  constructor(
    public parsers: Parser2<I, any, true>[],
    public canBacktrack: B,
  ) {
    super();
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("or", parsers);
    }
  }
  parseNext(input: I): ParserResult<O> | null {
    const start = input.checkpoint();
    for (const p of this.parsers) {
      input.reset(start);
      const result = p.parseNext(input);
      if (result !== null) {
        return result;
      }
    }
    if (this.canBacktrack) {
      return null;
    } else {
      throw new ParseError("No or branch matched");
    }
  }
}

// TODO: Bespoke impl
export function opt<I extends Stream<any>, P extends Parser2<I, any, true>>(
  parser: P,
): Parser2<I, ResultFromArg<P> | null, false> {
  return or(parser, yes() as any as Parser2<I, null, true>);
}

/** always succeeds, does not consume any tokens */
export function yes<I>(): Parser2<I, null, false> {
  return new YesParser();
}
class YesParser<I> extends Parser2<I, null, false> {
  canBacktrack: false = false;
  constructor() {
    super();
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("yes");
    }
  }
  parseNext(_input: I): ParserResult<null> | null {
    return { value: null };
  }
}

/** always fails, does not consume any tokens */
export function no<I>(): Parser2<I, never, false> {
  return new NoParser();
}
class NoParser<I> extends Parser2<I, never, false> {
  canBacktrack: false = false;
  constructor() {
    super();
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("no");
    }
  }
  parseNext(_input: I): ParserResult<never> | null {
    throw new ParseError("NoParser reached, will always fail");
  }
}

type SpanOutput<T> = { value: T; span: Span };
export function span<I extends StreamWithLocation, O, B>(
  parser: Parser2<I, O, B>,
): Parser2<I, SpanOutput<O>, B> {
  return new SpanParser(parser);
}
class SpanParser<I extends StreamWithLocation, O, B> extends Parser2<
  I,
  SpanOutput<O>,
  B
> {
  public canBacktrack: B;
  constructor(public parser: Parser2<I, O, B>) {
    super();
    this.canBacktrack = parser.canBacktrack;
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("span", [parser]);
    }
  }
  parseNext(input: I): ParserResult<SpanOutput<O>> | null {
    const before = input.currentTokenStart();
    // TODO: Or I could switch out the input riiight here with a "span tracker"
    const result = this.parser.parseNext(input);
    if (result === null) {
      return null;
    }
    const after = input.previousTokenEnd();
    return {
      value: {
        value: result.value,
        span: [before, after],
      },
    };
  }
}

/** Map results to a new value. Should not have side effects! */
export function map<I extends Stream<any>, OBefore, OAfter, B>(
  parser: Parser2<I, OBefore, B>,
  fn: (value: OBefore) => OAfter,
): Parser2<I, OAfter, B> {
  return new MapParser(parser, fn);
}
/** Map results to a new value. Mutating global state is allowed. */
export function mapMut<I extends Stream<any>, OBefore, OAfter>(
  parser: Parser2<I, OBefore, false>,
  fn: (value: OBefore) => OAfter,
): Parser2<I, OAfter, false> {
  return new MapParser(parser, fn);
}
class MapParser<I extends Stream<any>, OBefore, OAfter, B> extends Parser2<
  I,
  OAfter,
  B
> {
  public canBacktrack: B;
  constructor(
    public parser: Parser2<I, OBefore, B>,
    public fn: (value: OBefore) => OAfter,
  ) {
    super();
    this.canBacktrack = parser.canBacktrack;
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("map", [parser]);
    }
  }
  parseNext(input: I): ParserResult<OAfter> | null {
    const result = this.parser.parseNext(input);
    if (result === null) {
      return null;
    }
    return { value: this.fn(result.value) };
  }
}

export function repeat<I extends Stream<any>, O>(
  parser: Parser2<I, O, true>,
): Parser2<I, O[], false> {
  return new RepeatParser(parser, 0);
}

export function repeatPlus<I extends Stream<any>, O>(
  parser: Parser2<I, O, true>,
): Parser2<I, O[], false> {
  return new RepeatParser(parser, 1);
}
class RepeatParser<I extends Stream<any>, O> extends Parser2<I, O[], false> {
  canBacktrack: false = false;
  constructor(
    public parser: Parser2<I, O, true>,
    public minCount: number,
  ) {
    super();
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("repeat" + minCount, [parser]);
    }
  }
  parseNext(input: I): ParserResult<O[]> | null {
    const results: O[] = [];
    while (true) {
      const position = input.checkpoint();
      const result = this.parser.parseNext(input);
      if (result === null) {
        input.reset(position);
        break;
      }
      if (tracing) {
        const nextPosition = input.checkpoint();
        if (position === nextPosition) {
          throw new ParseError("Repeat parser must make progress");
        }
      }
      results.push(result.value);
    }
    if (results.length < this.minCount) {
      ParseError.throwMinElementCount(this.minCount, results.length);
    }
    return {
      value: results,
    };
  }
}

export function separated<I extends Stream<any>, O, O2>(
  parser: Parser2<I, O, true>,
  separator: Parser2<I, O2, true>,
  allowTrailing: boolean = false,
): Parser2<I, O[], false> {
  return new SeparatedParser(parser, separator, allowTrailing, 0);
}
export function separatedPlus<I extends Stream<any>, O, O2>(
  parser: Parser2<I, O, true>,
  separator: Parser2<I, O2, true>,
  allowTrailing: boolean = false,
): Parser2<I, O[], false> {
  return new SeparatedParser(parser, separator, allowTrailing, 1);
}
class SeparatedParser<I extends Stream<any>, O, O2> extends Parser2<
  I,
  O[],
  false
> {
  canBacktrack: false = false;
  constructor(
    public parser: Parser2<I, O, true>,
    public separator: Parser2<I, O2, true>,
    public allowTrailing: boolean,
    public minCount: number,
  ) {
    super();
    if (tracing) {
      this._traceInfo = new ParserTraceInfo("separated" + minCount, [parser]);
    }
  }
  parseNext(input: I): ParserResult<O[]> | null {
    const results: O[] = [];
    const startPosition = input.checkpoint();
    const result = this.parser.parseNext(input);
    if (result === null) {
      if (this.minCount > 0) {
        ParseError.throwMinElementCount(this.minCount, results.length);
      } else {
        input.reset(startPosition);
        return {
          value: results,
        };
      }
    }
    results.push(result.value);
    while (true) {
      const beforeSeparator = input.checkpoint();
      const resultSeparator = this.separator.parseNext(input);
      if (resultSeparator === null) {
        input.reset(beforeSeparator);
        break;
      }
      const beforeElement = input.checkpoint();
      const resultElement = this.parser.parseNext(input);
      if (resultElement === null) {
        if (this.allowTrailing) {
          input.reset(beforeElement);
        } else {
          input.reset(beforeSeparator);
        }
        break;
      }
      results.push(result.value);
    }

    if (results.length < this.minCount) {
      throw new ParseError(
        `Expected to find ${this.minCount} elements, but found ${results.length} elements`,
      );
    }
    return {
      value: results,
    };
  }
}

// TODO: peek
// TODO: any
// TODO: not
// TODO: verify

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
  static throwMinElementCount(
    expectedCount: number,
    actualCount: number,
  ): never {
    throw new ParseError(
      `Expected to find >=${expectedCount} elements, but only found ${actualCount} elements`,
    );
  }
}
