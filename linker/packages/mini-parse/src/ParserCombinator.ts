import {
  CombinatorArg,
  OrParser,
  ParserFromArg,
  ParserFromRepeatArg,
  ResultFromArg,
  SeqObjParser,
  SeqParser,
  SeqValues,
} from "./CombinatorTypes.js";
import { Lexer, quotedText } from "./MatchingLexer.js";
import {
  ExtendedResult,
  OptParserResult,
  Parser,
  parser,
  ParserContext,
  ParserResult,
  runExtended,
  simpleParser,
  trackChildren,
} from "./Parser.js";
import { closeArray, pushOpenArray } from "./ParserCollect.js";
import { ctxLog } from "./ParserLogging.js";
import { tracing } from "./ParserTracing.js";
import { OldToken } from "./TokenMatcher.js";

/** Parsing Combinators
 *
 * The basic idea is that parsers are contructed heirarchically from other parsers.
 * Each parser is independently testable and reusable with combinators like or() and seq().
 *
 * Each parser is a function that recognizes tokens produced by a lexer
 * and returns a result.
 *  Returning null indicate failure. Tokens are not consumed on failure.
 *  Users can also use the .tag() method to tag results from a stage. Tagged results
 *    propagate up to containing parsers for convenience in selecting results.
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

export class ParseError extends Error {
  constructor(msg?: string) {
    super(msg);
  }
}

/** Parse for a particular kind of token,
 * @return the matching text */
export function token(kindStr: string, value: string): Parser<string> {
  return simpleParser(
    `token '${kindStr}' ${quotedText(value)}`,
    (state: ParserContext): string | null => {
      const next = state.lexer.next();
      return next?.kind === kindStr && next.text === value ? next.text : null;
    },
  );
}

/** Parse for a particular kind of token,
 * @return the matching text */
export function tokenOf(kindStr: string, values: string[]): Parser<string> {
  return simpleParser(
    `tokenOf '${kindStr}'`,
    (state: ParserContext): string | null => {
      const next = state.lexer.next();
      return next?.kind === kindStr && values.includes(next.text) ?
          next.text
        : null;
    },
  );
}

/** Parse for a particular kind of token,
 * @return the matching text */
export function kind(kindStr: string): Parser<string> {
  return simpleParser(
    `kind '${kindStr}'`,
    (state: ParserContext): string | null => {
      const next = state.lexer.next();
      return next?.kind === kindStr ? next.text : null;
    },
  );
}

/** Parse for a token containing a text value
 * @return the kind of token that matched */
export function text(value: string): Parser<string> {
  return simpleParser(
    `${quotedText(value)}`,
    (state: ParserContext): string | null => {
      const next = state.lexer.next();
      return next?.text === value ? next.text : null;
    },
  );
}

/** Parse a sequence of parsers
 * @return an array of all parsed results, or null if any parser fails */
export function seq<P extends CombinatorArg[]>(...args: P): SeqParser<P> {
  const parsers = args.map(parserArg);
  const seqParser = parser("seq", (ctx: ParserContext) => {
    const values = [];
    let failed = false;
    for (const p of parsers) {
      const result = p._run(ctx);
      if (result === null) {
        failed = true;
        break;
      }

      values.push(result.value);
    }
    if (failed) return null;
    return { value: values };
  }).collect({ before: pushOpenArray, after: closeArray });

  trackChildren(seqParser, ...parsers);

  return seqParser as SeqParser<P>;
}

/** Parse a sequence of parsers
 * @return an array of all parsed results, or null if any parser fails */
export function seqObj<P extends { [key: string]: CombinatorArg }>(
  args: P,
): SeqObjParser<P> {
  const parsers = Object.entries(args).map(
    ([name, arg]) => [name as keyof P, parserArg(arg)] as const,
  );
  const seqObjParser = parser("seqObj", (ctx: ParserContext) => {
    const values: Partial<Record<keyof P, any>> = {};
    let failed = false;
    for (const [name, p] of parsers) {
      const result = p._run(ctx);
      if (result === null) {
        failed = true;
        break;
      }

      values[name] = result.value;
    }
    if (failed) return null;
    return { value: values };
  }).collect({ before: pushOpenArray, after: closeArray });

  trackChildren(seqObjParser, ...parsers.map(v => v[1]));

  return seqObjParser as SeqObjParser<P>;
}

/** Parse two values, and discard the first value
 * @return the second value, or null if any parser fails */
export function preceded<P extends CombinatorArg>(
  ignoredArg: CombinatorArg,
  arg: P,
): ParserFromArg<P> {
  const ignored = parserArg(ignoredArg);
  const p = parserArg(arg);
  const precededParser: ParserFromArg<P> = parser(
    "preceded",
    (ctx: ParserContext) => {
      const ignoredResult = ignored._run(ctx);
      if (ignoredResult === null) return null;
      const result = p._run(ctx);
      return result;
    },
  ).collect({ before: pushOpenArray, after: closeArray });

  trackChildren(precededParser, ignored, p);

  return precededParser;
}

/** Parse two values, and discard the second value
 * @return the second value, or null if any parser fails */
export function terminated<P extends CombinatorArg>(
  arg: P,
  ignoredArg: CombinatorArg,
): ParserFromArg<P> {
  const p = parserArg(arg);
  const ignored = parserArg(ignoredArg);
  const terminatedParser: ParserFromArg<P> = parser(
    "terminated",
    (ctx: ParserContext) => {
      const result = p._run(ctx);
      const ignoredResult = ignored._run(ctx);
      if (ignoredResult === null) return null;
      return result;
    },
  ).collect({ before: pushOpenArray, after: closeArray });

  trackChildren(terminatedParser, ignored, p);

  return terminatedParser;
}

/** Parse three values, and only keep the middle value
 * @return the second value, or null if any parser fails */
export function delimited<P extends CombinatorArg>(
  ignoredArg1: CombinatorArg,
  arg: P,
  ignoredArg2: CombinatorArg,
): ParserFromArg<P> {
  const ignored1 = parserArg(ignoredArg1);
  const p = parserArg(arg);
  const ignored2 = parserArg(ignoredArg2);
  const delimitedParser: ParserFromArg<P> = parser(
    "delimited",
    (ctx: ParserContext) => {
      const ignoredResult1 = ignored1._run(ctx);
      if (ignoredResult1 === null) return null;
      const result = p._run(ctx);
      const ignoredResult2 = ignored2._run(ctx);
      if (ignoredResult2 === null) return null;
      return result;
    },
  ).collect({ before: pushOpenArray, after: closeArray });

  trackChildren(delimitedParser, ignored1, p, ignored2);

  return delimitedParser;
}

/** Try parsing with one or more parsers,
 *  @return the first successful parse */
export function or<P extends CombinatorArg[]>(...args: P): OrParser<P> {
  const parsers = args.map(parserArg);
  const orParser = parser("or", (state: ParserContext) => {
    for (const p of parsers) {
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

const undefinedResult: ParserResult<undefined> = {
  value: undefined,
};

export type UndefinedParser = Parser<undefined>;
/** Try a parser.
 *
 * If the parse succeeds, return the result.
 * If the parser fails, return false and don't advance the input. Returning false
 * indicates a successful parse, so combinators like seq() will succeed.
 */
export function opt<P extends CombinatorArg>(
  arg: P,
): ParserFromArg<P> | UndefinedParser {
  const p = parserArg(arg);

  const optParser: ParserFromArg<P> | UndefinedParser = parser(
    "opt",
    (state: ParserContext) => {
      const result = p._run(state);
      // If parsing fails, we return instead a success
      // with 'undefined' as a value

      // cast the undefined result here and recover type with the ascription above
      type PR = ParserResult<ResultFromArg<P>>;
      return result || (undefinedResult as PR);
    },
  );
  trackChildren(optParser, p);
  return optParser;
}

/** return true if the provided parser _doesn't_ match
 * does not consume any tokens */
export function not(arg: CombinatorArg): Parser<true> {
  const p = parserArg(arg);
  const notParser: Parser<true> = parser("not", (state: ParserContext) => {
    const pos = state.lexer.position();
    const result = p._run(state);
    if (!result) {
      return { value: true, tags: {} };
    }
    state.lexer.position(pos);
    return null;
  });
  trackChildren(notParser, p);

  return notParser;
}

/** yield next token, any token */
export function any(): Parser<OldToken> {
  return simpleParser("any", (state: ParserContext): OldToken | null => {
    const next = state.lexer.next();
    return next || null;
  });
}

/** yield next token if the provided parser doesn't match */
export function anyNot(arg: CombinatorArg): Parser<OldToken> {
  return seq(not(arg), any())
    .map(r => r.value[1])
    .traceName("anyNot");
}

/** match everything until a terminator (and the terminator too) */
export function anyThrough<A extends CombinatorArg>(
  arg: A,
): Parser<[...any, ResultFromArg<A>]> {
  const p = parserArg<A>(arg);
  const anyParser = seq(repeat(anyNot(p)), p).traceName(
    `anyThrough ${p.debugName}`,
  );
  trackChildren(anyParser, p);
  type V = typeof anyParser extends Parser<infer V> ? V : never;
  return anyParser as Parser<V>;

  // LATER TS not sure why this doesn't work
  // type T = TagsFromArg<A>;
  // return result as Parser<V, T>;
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
    .map(r => [r.value[0], ...r.value[1]])
    .traceName("repeatPlus");
  trackChildren(repeatParser, p);
  return repeatParser;
}

type ResultFilterFn<T> = (
  result: ExtendedResult<T | string, any>,
) => boolean | undefined;

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
  return (ctx: ParserContext): RepeatWhileResult<A> => {
    const values: ResultFromArg<A>[] = [];
    for (;;) {
      const result = runExtended<ResultFromArg<A>>(ctx, p);

      // continue acccumulating until we get a null or the filter tells us to stop
      if (result !== null && filterFn(result)) {
        values.push(result.value);
      } else {
        // always return succcess
        const r = { value: values };
        return r;
      }
    }
  };
}

/** yields true if parsing has reached the end of input */
export function eof(): Parser<true> {
  return simpleParser("eof", (state: ParserContext) => {
    const result = state.lexer.next();
    if (result === undefined) {
      return true;
    } else {
      return null;
    }
  });
}

/** if parsing fails, log an error and abort parsing */
export function req<A extends CombinatorArg>(
  arg: A,
  msg?: string,
): ParserFromArg<A> {
  const p = parserArg(arg);
  const reqParser = parser("req", (ctx: ParserContext) => {
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
export function yes(): Parser<true> {
  return simpleParser("yes", () => true);
}

/** always fails, does not consume any tokens */
export function no(): Parser<null> {
  return simpleParser("no", () => null);
}

export interface WithSepOptions {
  /** if true, allow an optional trailing separator (default true) */
  trailing?: boolean;
  /** if true, require at least one element (default false) */
  requireOne?: boolean;
}

/** match an optional series of elements separated by a delimiter (e.g. a comma) */
export function withSep<P extends CombinatorArg>(
  sep: CombinatorArg,
  p: P,
  opts: WithSepOptions = {},
): Parser<ResultFromArg<P>[]> {
  const { trailing = true, requireOne = false } = opts;
  const parser = parserArg(p);
  const sepParser = parserArg(sep);
  const pTagged = or(parser); //.tag("_sepTag");
  const first = requireOne ? pTagged : opt(pTagged);
  const last = trailing ? opt(sepParser) : yes();

  const withSepParser = seq(first, repeat(preceded(sepParser, pTagged)), last)
    .map(r => {
      let firstResult = r.value[0];
      let repeatResults = r.value[1];
      return [firstResult].concat(repeatResults);
    })
    .traceName("withSep") as any;

  trackChildren(withSepParser, parser, sepParser);

  return withSepParser;
}

/** match an series of one or more elements separated by a delimiter (e.g. a comma) */
export function withSepPlus<P extends CombinatorArg>(
  sep: CombinatorArg,
  p: P,
): Parser<ResultFromArg<P>[]> {
  return withSep(sep, p, { requireOne: true }).traceName("withSepPlus");
}

/** run a parser with a provided token matcher (i.e. use a temporary lexing mode) */
export function lexerAction<U>(action: (lexer: Lexer) => U | null): Parser<U> {
  const tokensParser = simpleParser(
    `tokens lexerAction`,
    (state: ParserContext) => {
      return action(state.lexer);
    },
  );
  return tokensParser;
}

/** convert naked string arguments into text() parsers and functions into fn() parsers */
export function parserArg<A extends CombinatorArg>(arg: A): ParserFromArg<A> {
  if (typeof arg === "string") {
    return text(arg) as ParserFromArg<A>; // LATER fix cast
  } else if (arg instanceof Parser) {
    return arg as Parser<ResultFromArg<A>>;
  }
  return fn(arg as () => ParserFromArg<A>);
}

/** A delayed parser definition, for making recursive parser definitions.  */
export function fn<T>(fn: () => Parser<T>): Parser<T> {
  const fp = parser("fn()", (state: ParserContext): OptParserResult<T> => {
    if (!fn) {
      const deepName = state._debugNames.join(".");
      throw new Error(`fn parser called before definition: ${deepName}`);
    }
    const stage = fn();
    return stage._run(state);
  });
  if (tracing) (fp as any)._fn = fn; // tricksy hack for pretty printing contained fns
  return fp;
}
