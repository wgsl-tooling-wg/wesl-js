import {
  CombinatorArg,
  InputFromArg,
  OrParser,
  ParserFromArg,
  ParserFromRepeatArg,
  ResultFromArg,
  SeqObjParser,
  SeqParser,
  SeqValues,
} from "./CombinatorTypes.js";
import {
  OptParserResult,
  ParseError,
  Parser,
  parser,
  ParserContext,
  ParserResult,
  ParserStream,
  runExtended,
  simpleParser,
  trackChildren,
} from "./Parser.js";
import { closeArray, pushOpenArray } from "./ParserCollect.js";
import { ctxLog, quotedText, srcTrace } from "./ParserLogging.js";
import { tracing } from "./ParserTracing.js";
import { Span } from "./Span.js";
import { peekToken, Stream, Token, TypedToken } from "./Stream.js";

/** Parsing Combinators
 *
 * The basic idea is that parsers are contructed heirarchically from other parsers.
 * Each parser is independently testable and reusable with combinators like or() and seq().
 *
 * Each parser is a function that recognizes tokens produced by a lexer
 * and returns a result.
 *  Returning null indicate failure. Tokens are not consumed on failure.
 *
 * Built in parsers and combinators are available:
 *  kind() recognizes tokens of a particular type.
 *  or(), seq(), opt(), map() and repeat() combine other stages.
 *
 * Users construct their own parsers by combining other parser stages
 * and typically use map() to report results. Results can be stored
 * in the array app[], which is provided by the user and available for
 * all user constructed parsers.
 */

/** Parse for a particular kind of token,
 * @return the matching text */
export function token<const Kind extends string>(
  kindStr: Kind,
  value: string,
): Parser<Stream<TypedToken<Kind>>, TypedToken<Kind>> {
  return simpleParser(
    `token '${kindStr}' ${quotedText(value)}`,
    function _token(
      state: ParserContext,
    ): ParserResult<TypedToken<Kind>> | null {
      const start = state.stream.checkpoint();
      const next = state.stream.nextToken();
      if (next === null) return null;
      if (tracing) {
        const text = quotedText(next.text);
        srcTrace(state.stream.src, start, `: ${text} (${next.kind})`);
      }
      if (next.kind !== kindStr || next.text !== value) {
        state.stream.reset(start);
        return null;
      }
      return { value: next as TypedToken<Kind> };
    },
  );
}

/** Parse for a particular kind of token,
 * @return the matching text */
export function tokenOf<const Kind extends string>(
  kindStr: Kind,
  values: string[],
): Parser<Stream<TypedToken<Kind>>, TypedToken<Kind>> {
  return simpleParser(
    `tokenOf '${kindStr}'`,
    function _tokenOf(
      state: ParserContext,
    ): ParserResult<TypedToken<Kind>> | null {
      const start = state.stream.checkpoint();
      const next = state.stream.nextToken();
      if (next === null) return null;
      if (tracing) {
        const text = quotedText(next.text);
        srcTrace(state.stream.src, start, `: ${text} (${next.kind})`);
      }
      if (next.kind !== kindStr || !values.includes(next.text)) {
        state.stream.reset(start);
        return null;
      }
      return { value: next as TypedToken<Kind> };
    },
  );
}

/** Parse for a particular kind of token,
 * @return the matching text */
export function kind<const Kind extends string>(
  kindStr: Kind,
): Parser<Stream<TypedToken<Kind>>, string> {
  return simpleParser(
    `kind '${kindStr}'`,
    function _kind(state: ParserContext): ParserResult<string> | null {
      const start = state.stream.checkpoint();
      const next = state.stream.nextToken();
      if (next === null) return null;
      if (tracing) {
        const text = quotedText(next.text);
        srcTrace(state.stream.src, start, `: ${text} (${next.kind})`);
      }
      if (next.kind !== kindStr) {
        state.stream.reset(start);
        return null;
      }
      return { value: next.text };
    },
  );
}

// export class KindParser<I, const Kind extends string> extends Parser<
//   Stream<TypedToken<Kind>>,
//   string
// > {}

/** Parse for a token containing a text value
 * @return the kind of token that matched */
export function text(value: string): Parser<ParserStream, string> {
  return simpleParser(
    `${quotedText(value)}`,
    function _text(state: ParserContext): ParserResult<string> | null {
      const start = state.stream.checkpoint();
      const next = state.stream.nextToken();
      if (next === null) return null;
      if (tracing) {
        const text = quotedText(next.text);
        srcTrace(state.stream.src, start, `: ${text} (${next.kind})`);
      }
      if (next.text !== value) {
        state.stream.reset(start);
        return null;
      }
      return { value: next.text };
    },
  );
}

/** Parse for a token containing a text value
 * @return the kind of token that matched */
export function textOf(values: string[]): Parser<ParserStream, string> {
  return simpleParser(
    `${quotedText(values.join(","))}`,
    function _text(state: ParserContext): ParserResult<string> | null {
      const start = state.stream.checkpoint();
      const next = state.stream.nextToken();
      if (next === null) return null;
      if (tracing) {
        const text = quotedText(next.text);
        srcTrace(state.stream.src, start, `: ${text} (${next.kind})`);
      }
      if (!values.includes(next.text)) {
        state.stream.reset(start);
        return null;
      }
      return { value: next.text };
    },
  );
}

/** Parse a sequence of parsers
 * @return an array of all parsed results, or null if any parser fails */
export function seq<P extends CombinatorArg[]>(...args: P): SeqParser<P> {
  const parsers = args.map(parserArg);
  const seqParser = parser("seq", function _seq(ctx: ParserContext) {
    const values = [];
    for (const p of parsers) {
      const result = p._run(ctx);
      if (result === null) {
        return null;
      }
      values.push(result.value);
    }
    return { value: values };
  });

  trackChildren(seqParser, ...parsers);

  return seqParser as SeqParser<P>;
}

/** Parse a sequence of parsers. Each named parser will be executed, and place its result in an equally named output.
 * @return an object of all parsed results, or null if any parser fails */
export function seqObj<P extends { [key: string]: CombinatorArg }>(
  args: P,
): SeqObjParser<P> {
  const parsers = Object.entries(args).map(
    ([name, arg]) => [name as keyof P, parserArg(arg)] as const,
  );
  const seqObjParser = parser("seqObj", function _seqObj(ctx: ParserContext) {
    const values: Partial<Record<keyof P, any>> = {};
    for (const [name, p] of parsers) {
      const result = p._run(ctx);
      if (result === null) {
        return null;
      }

      values[name] = result.value;
    }
    return { value: values };
  });

  trackChildren(seqObjParser, ...parsers.map(v => v[1]));

  return seqObjParser as SeqObjParser<P>;
}

export function collectArray<I, O>(p: Parser<I, O>): Parser<I, O> {
  return p.collect({ before: pushOpenArray, after: closeArray });
}

/** Parse two values, and discard the first value
 * @return the second value, or null if any parser fails */
export function preceded<
  Ignored extends CombinatorArg,
  P extends CombinatorArg,
>(
  ignoredArg: Ignored,
  arg: P,
): Parser<InputFromArg<Ignored> | InputFromArg<P>, ResultFromArg<P>> {
  const ignored = parserArg(ignoredArg);
  const p = parserArg(arg);
  const precededParser: ParserFromArg<P> = parser(
    "preceded",
    function _preceded(ctx: ParserContext) {
      const ignoredResult = ignored._run(ctx);
      if (ignoredResult === null) return null;
      const result = p._run(ctx);
      return result;
    },
  );

  trackChildren(precededParser, ignored, p);

  return precededParser;
}

/** Parse two values, and discard the second value
 * @return the first value, or null if any parser fails */
export function terminated<
  P extends CombinatorArg,
  Ignored extends CombinatorArg,
>(
  arg: P,
  ignoredArg: Ignored,
): Parser<InputFromArg<P> | InputFromArg<Ignored>, ResultFromArg<P>> {
  const p = parserArg(arg);
  const ignored = parserArg(ignoredArg);
  const terminatedParser: ParserFromArg<P> = parser(
    "terminated",
    function _terminated(ctx: ParserContext) {
      const result = p._run(ctx);
      const ignoredResult = ignored._run(ctx);
      if (ignoredResult === null) return null;
      return result;
    },
  );

  trackChildren(terminatedParser, ignored, p);

  return terminatedParser;
}

/** Parse three values, and only keep the middle value
 * @return the second value, or null if any parser fails */
export function delimited<
  Ignored1 extends CombinatorArg,
  P extends CombinatorArg,
  Ignored2 extends CombinatorArg,
>(
  ignoredArg1: Ignored1,
  arg: P,
  ignoredArg2: Ignored2,
): Parser<
  InputFromArg<Ignored1> | InputFromArg<P> | InputFromArg<Ignored2>,
  ResultFromArg<P>
> {
  const ignored1 = parserArg(ignoredArg1);
  const p = parserArg(arg);
  const ignored2 = parserArg(ignoredArg2);
  const delimitedParser: ParserFromArg<P> = parser(
    "delimited",
    function _delimited(ctx: ParserContext) {
      const ignoredResult1 = ignored1._run(ctx);
      if (ignoredResult1 === null) return null;
      const result = p._run(ctx);
      const ignoredResult2 = ignored2._run(ctx);
      if (ignoredResult2 === null) return null;
      return result;
    },
  );

  trackChildren(delimitedParser, ignored1, p, ignored2);

  return delimitedParser;
}

/** Try parsing with one or more parsers,
 *  @return the first successful parse */
export function or<P extends CombinatorArg[]>(...args: P): OrParser<P> {
  const parsers = args.map(parserArg);
  const orParser = parser("or", function _or(state: ParserContext) {
    const start = state.stream.checkpoint();
    for (const p of parsers) {
      state.stream.reset(start);
      const result = p._run(state);
      if (result !== null) {
        return result;
      }
    }
    return null;
  });

  trackChildren(orParser, ...parsers);

  return orParser as OrParser<P>;
}

/** Try a parser.
 *
 * If the parse succeeds, return the result.
 * If the parser fails, return false and don't advance the input. Returning false
 * indicates a successful parse, so combinators like seq() will succeed.
 */
export function opt<P extends CombinatorArg>(
  arg: P,
): Parser<InputFromArg<P>, ResultFromArg<P> | null> {
  const p = parserArg(arg);
  const optParser = parser(
    "opt",
    function _opt(state: ParserContext): ParserResult<ResultFromArg<P> | null> {
      const start = state.stream.checkpoint();
      const result = p._run(state);
      if (result === null) {
        state.stream.reset(start);
        return { value: null };
      } else {
        return result;
      }
    },
  );
  trackChildren(optParser, p);
  return optParser;
}

/** return true if the provided parser _doesn't_ match
 * does not consume any tokens */
export function not<P extends CombinatorArg>(
  arg: P,
): Parser<InputFromArg<P>, true> {
  const p = parserArg(arg);
  const notParser: Parser<InputFromArg<P>, true> = parser(
    "not",
    function _not(state: ParserContext) {
      const pos = state.stream.checkpoint();
      const result = p._run(state);
      if (result === null) {
        return { value: true };
      }
      state.stream.reset(pos);
      return null;
    },
  );
  trackChildren(notParser, p);

  return notParser;
}

/** yield next token, any token */
export function any(): Parser<ParserStream, Token> {
  return simpleParser(
    "any",
    function _any(state: ParserContext): ParserResult<Token> | null {
      const value = state.stream.nextToken();
      if (value === null) return null;
      return { value };
    },
  );
}

/** yield next token if the provided parser doesn't match */
export function anyNot<P extends CombinatorArg>(
  arg: P,
): Parser<InputFromArg<P>, Token> {
  return seq(not(arg), any())
    .map(r => r[1])
    .setTraceName("anyNot");
}

/** match everything until a terminator (and the terminator too) */
export function anyThrough<A extends CombinatorArg>(
  arg: A,
): Parser<InputFromArg<A>, [Token[], ResultFromArg<A>]> {
  const p = parserArg<A>(arg);
  const anyParser = seq(repeat(anyNot(p)), p).setTraceName(
    `anyThrough ${p.debugName}`,
  );
  trackChildren(anyParser, p);
  return anyParser;
}

/** match zero or more instances of a parser */
export function repeat<A extends CombinatorArg>(
  arg: A,
): ParserFromRepeatArg<A> {
  const p = parserArg(arg);
  const repeatParser = parser("repeat", repeatWhileFilter(p));
  trackChildren(repeatParser, p);
  return repeatParser;
}

/** match one or more instances of a parser */
export function repeatPlus<A extends CombinatorArg>(
  arg: A,
): ParserFromRepeatArg<A> {
  const p = parserArg(arg);
  const repeatParser = seq(p, repeat(p))
    .map(r => [r[0], ...r[1]])
    .setTraceName("repeatPlus");
  trackChildren(repeatParser, p);
  return repeatParser;
}

type ResultFilterFn<T> = (result: ParserResult<T>) => boolean;

export function repeatWhile<A extends CombinatorArg>(
  arg: A,
  filterFn: ResultFilterFn<ResultFromArg<A>>,
): ParserFromRepeatArg<A> {
  const p = parserArg(arg);
  const result = parser("repeatWhile", repeatWhileFilter(p, filterFn));
  trackChildren(result, p);
  return result;
}

type RepeatWhileResult<A extends CombinatorArg> = OptParserResult<
  SeqValues<A[]>
>;

function repeatWhileFilter<T, A extends CombinatorArg>(
  p: ParserFromArg<A>,
  filterFn: ResultFilterFn<ResultFromArg<A>> = () => true,
): (ctx: ParserContext) => RepeatWhileResult<A> {
  return function _repeatWhileFilter(ctx: ParserContext): RepeatWhileResult<A> {
    const values: ResultFromArg<A>[] = [];
    for (;;) {
      const before = ctx.stream.checkpoint();
      const result = runExtended<InputFromArg<A>, ResultFromArg<A>>(ctx, p);
      if (result === null) {
        ctx.stream.reset(before);
        return { value: values };
      }
      // TODO: that's not a filter!
      if (!filterFn(result)) {
        return { value: values };
      }

      if (tracing) {
        const after = ctx.stream.checkpoint();
        if (before === after) {
          ctxLog(
            ctx,
            `infinite loop, parser passed to repeat must always make progress`,
          );
          throw new ParseError();
        }
      }

      // continue acccumulating until we get a null or the filter tells us to stop
      values.push(result.value);
    }
  };
}

export function span<A extends CombinatorArg>(
  arg: A,
): Parser<InputFromArg<A>, { value: ResultFromArg<A>; span: Span }> {
  const p = parserArg(arg);
  const result = parser("span", function _span(ctx: ParserContext) {
    const start = peekToken(ctx.stream)?.span?.[0] ?? null;
    const result = p._run(ctx);
    if (result === null) return null;
    const end = ctx.stream.checkpoint();
    return {
      value: {
        value: result.value,
        span: [start ?? end, end] as const,
      },
    };
  });
  trackChildren(result, arg);
  return result;
}

/** yields true if parsing has reached the end of input */
export function eof(): Parser<ParserStream, true> {
  return simpleParser("eof", function _eof(state: ParserContext) {
    const start = state.stream.checkpoint();
    const result = state.stream.nextToken();
    if (result !== null) {
      state.stream.reset(start);
      return null;
    }
    return { value: true };
  });
}

/** if parsing fails, log an error and abort parsing */
export function req<A extends CombinatorArg>(
  arg: A,
  msg?: string,
): ParserFromArg<A> {
  const p = parserArg(arg);
  const reqParser = parser("req", function _req(ctx: ParserContext) {
    const result = p._run(ctx);
    if (result === null) {
      const deepName = ctx._debugNames.join(" > "); // TODO DRY this
      ctxLog(ctx, msg ?? `expected ${p.debugName} ${deepName}`);
      throw new ParseError();
    }
    return result;
  });
  trackChildren(reqParser, p);
  return reqParser;
}

/** always succeeds, does not consume any tokens */
export function yes<T>(value: T): Parser<ParserStream, T>;
export function yes(): Parser<ParserStream, null>;
export function yes(value: any = null): Parser<ParserStream, any> {
  return simpleParser("yes", function _yes() {
    return { value: value };
  });
}

/** always fails, does not consume any tokens */
export function no(): Parser<ParserStream, null> {
  return simpleParser("no", function _no() {
    return null;
  });
}

export interface WithSepOptions {
  /** if true, allow an optional trailing separator (default true) */
  trailing?: boolean;
  /** if true, require at least one element (default false) */
  requireOne?: boolean;
}

/** match an optional series of elements separated by a delimiter (e.g. a comma) */
export function withSep<Sep extends CombinatorArg, P extends CombinatorArg>(
  sep: Sep,
  p: P,
  opts: WithSepOptions = {},
): Parser<InputFromArg<Sep> | InputFromArg<P>, ResultFromArg<P>[]> {
  const { trailing = true, requireOne = false } = opts;
  const elementParser = parserArg(p);
  const sepParser = parserArg(sep);
  return parser("withSep", function _withSep(ctx: ParserContext) {
    const results: ResultFromArg<P>[] = [];
    const startPosition = ctx.stream.checkpoint();
    const result = elementParser._run(ctx);
    if (result === null) {
      ctx.stream.reset(startPosition);
      if (requireOne) {
        return null;
      } else {
        return {
          value: results,
        };
      }
    }
    results.push(result.value);
    while (true) {
      const beforeSeparator = ctx.stream.checkpoint();
      const resultSeparator = sepParser._run(ctx);
      if (resultSeparator === null) {
        ctx.stream.reset(beforeSeparator);
        break;
      }
      const beforeElement = ctx.stream.checkpoint();
      const resultElement = elementParser._run(ctx);
      if (resultElement === null) {
        if (trailing) {
          ctx.stream.reset(beforeElement);
        } else {
          ctx.stream.reset(beforeSeparator);
        }
        break;
      }
      results.push(resultElement.value);
    }
    return {
      value: results,
    };
  });
}

/** match an series of one or more elements separated by a delimiter (e.g. a comma) */
export function withSepPlus<Sep extends CombinatorArg, P extends CombinatorArg>(
  sep: Sep,
  p: P,
): Parser<InputFromArg<Sep> | InputFromArg<P>, ResultFromArg<P>[]> {
  return withSep(sep, p, { requireOne: true }).setTraceName("withSepPlus");
}

/** run a parser with a provided token matcher (i.e. use a temporary lexing mode) */
export function withStreamAction<U>(
  action: (stream: Stream<Token>) => U | null,
): Parser<ParserStream, U> {
  return simpleParser(
    `withStreamAction`,
    function _withStreamAction(state: ParserContext) {
      const result = action(state.stream);
      if (result === null) return null;
      return { value: result };
    },
  );
}

/** convert naked string arguments into text() parsers and functions into fn() parsers */
export function parserArg<A extends CombinatorArg>(arg: A): ParserFromArg<A> {
  if (typeof arg === "string") {
    return text(arg) as ParserFromArg<A>; // LATER fix cast
  } else if (arg instanceof Parser) {
    return arg as Parser<InputFromArg<A>, ResultFromArg<A>>;
  }
  return fn(arg as () => ParserFromArg<A>);
}

/** A delayed parser definition, for making recursive parser definitions.  */
export function fn<I, T>(fn: () => Parser<I, T>): Parser<I, T> {
  const fp = parser(
    "fn()",
    function _fn(state: ParserContext): OptParserResult<T> {
      if (!fn) {
        const deepName = state._debugNames.join(".");
        throw new Error(`fn parser called before definition: ${deepName}`);
      }
      const stage = fn();
      return stage._run(state);
    },
  );
  if (tracing) (fp as any)._fn = fn; // tricksy hack for pretty printing contained fns
  return fp;
}
