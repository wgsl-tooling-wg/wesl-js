/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  CombinatorArgOld,
  CombinatorArg,
  OrParser,
  ParserFromArg,
  ParserNamesFromArg,
  ParserResultFromArg,
  SeqParser
} from "./CombinatorTypes.js";
import { quotedText } from "./MatchingLexer.js";
import {
  ExtendedResult,
  NameRecord,
  NoNameRecord,
  OptParserResult,
  Parser,
  ParserContext,
  parser,
  runExtended,
  simpleParser,
  tokenSkipSet,
} from "./Parser.js";
import { ctxLog } from "./ParserLogging.js";
import { mergeNamed } from "./ParserUtil.js";
import { Token, TokenMatcher } from "./TokenMatcher.js";

/** Parsing Combinators
 *
 * The basic idea is that parsers are contructed heirarchically from other parsers.
 * Each parser is independently testable and reusable with combinators like or() and seq().
 *
 * Each parser is a function that recognizes tokens produced by a lexer
 * and returns a result.
 *  Returning null indicate failure. Tokens are not consumed on failure.
 *  Users can also use the .named() method to tag results from a stage. Named results
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
export function kind(kindStr: string): Parser<string> {
  return simpleParser(
    `kind '${kindStr}'`,
    (state: ParserContext): string | null => {
      const next = state.lexer.next();
      return next?.kind === kindStr ? next.text : null;
    }
  );
}

/** Parse for a token containing a text value
 * @return the kind of token that matched */
export function text(value: string): Parser<string, NoNameRecord> {
  return simpleParser(
    `text ${quotedText(value)}'`,
    (state: ParserContext): string | null => {
      const next = state.lexer.next();
      return next?.text === value ? next.text : null;
    }
  );
}

/** Parse a sequence of parsers
 * @return an array of all parsed results, or null if any parser fails */
export function seq<P extends CombinatorArg[]>(...args: P): SeqParser<P> {
  const parsers = args.map(parserArg);

  const result = parser("seq", (ctx: ParserContext) => {
    const values = [];
    let namedResults = {};
    for (const p of parsers) {
      const result = p._run(ctx);
      if (result === null) return null;

      namedResults = mergeNamed(namedResults, result.named);
      values.push(result.value);
    }
    return { value: values, named: namedResults };
  });

  return result as SeqParser<P>;
}

/** Try parsing with one or more parsers,
 *  @return the first successful parse */
export function or<P extends CombinatorArg[]>(
  ...args: P
): OrParser<P> {
  const parsers = args.map(parserArg);
  const result = parser("or", (state: ParserContext) => {
    for (const p of parsers) {
      const result = p._run(state);
      if (result !== null) {
        return result;
      }
    }
    return null;
  });

  return result as OrParser<P>;
}

/** Try a parser.
 *
 * If the parse succeeds, return the result.
 * If the parser fails, return false and don't advance the input. Returning false
 * indicates a successful parse, so combinators like seq() will succeed.
 */
export function opt<P extends CombinatorArg>(
  arg: P
): ParserFromArg<P> | Parser<undefined, NoNameRecord> {
  const p = parserArg(arg);
  const result = parser("opt", (state: ParserContext) => {
    const result = p._run(state);
    return result || { value: undefined, named: {} };
  });
  return result as ParserFromArg<P> | Parser<undefined, NoNameRecord>;
}

/** return true if the provided parser _doesn't_ match
 * does not consume any tokens */
export function not<T>(stage: CombinatorArgOld<T>): Parser<true> {
  const p = parserArg(stage);
  return parser("not", (state: ParserContext): OptParserResult<true> => {
    const pos = state.lexer.position();
    const result = p._run(state);
    if (!result) {
      return { value: true, named: {} };
    }
    state.lexer.position(pos);
    return null;
  });
}

/** yield next token, any token */
export function any(): Parser<Token> {
  return simpleParser("any", (state: ParserContext): Token | null => {
    const next = state.lexer.next();
    return next || null;
  });
}

/** yield next token if the provided parser doesn't match */
export function anyNot<T>(arg: CombinatorArgOld<T>): Parser<Token> {
  return seq(not(arg), any())
    .map((r) => r.value[1])
    .traceName("anyNot");
}

/** match everything until a terminator (and the terminator too) */
export function anyThrough(arg: CombinatorArgOld<any>): Parser<any> {
  const p = parserArg(arg);
  return seq(repeat(anyNot(p)), p).traceName(`anyThrough ${p.debugName}`);
}

/** match zero or more instances of a parser */
export function repeat(stage: string): Parser<string[]>;
export function repeat<T>(stage: Parser<T>): Parser<T[]>;
export function repeat<T>(stage: CombinatorArgOld<T>): Parser<T[] | string[]> {
  return parser("repeat", repeatWhileFilter(stage));
}
type ResultFilterFn<T> = (
  result: ExtendedResult<T | string, any>
) => boolean | undefined;

export function repeatWhile<T>(
  arg: CombinatorArgOld<T>,
  filterFn: ResultFilterFn<T>
): Parser<(T | string)[]> {
  return parser("repeatWhile", repeatWhileFilter(arg, filterFn));
}

// TODO we'd like to report a correct type for the merged named results
function repeatWhileFilter<T, N extends NameRecord>(
  arg: CombinatorArgOld<T, N>,
  filterFn: ResultFilterFn<T> = () => true
): (ctx: ParserContext) => OptParserResult<T[] | string[], N> {
  const p = parserArg(arg);
  return (ctx: ParserContext): OptParserResult<T[] | string[], N> => {
    const values: (T | string)[] = [];
    let results = {};
    for (;;) {
      const result = runExtended<T | string, any>(ctx, p);

      // continue acccumulating until we get a null or the filter tells us to stop
      if (result !== null && filterFn(result)) {
        values.push(result.value);
        results = mergeNamed(results, result.named);
      } else {
        // always return succcess
        const r = { value: values, named: results };
        return r as OptParserResult<T[] | string[], N>; // TODO typing of better named results
      }
    }
  };
}

/** A delayed parser definition, for making recursive parser definitions. */
export function fn<T, N extends NameRecord>(
  fn: () => Parser<T, N>
): Parser<T, N> {
  return parser("fn", (state: ParserContext): OptParserResult<T, N> => {
    const stage = fn();
    return stage._run(state);
  });
}

/** yields true if parsing has reached the end of input */
export function eof(): Parser<true> {
  return simpleParser(
    "eof",
    (state: ParserContext) => state.lexer.eof() || null
  );
}

/** if parsing fails, log an error and abort parsing */
export function req<T, N extends NameRecord>(
  arg: CombinatorArgOld<T, N>,
  msg?: string
): Parser<T | string, N> {
  const p = parserArg(arg);
  return parser("req", (ctx: ParserContext): OptParserResult<T | string, N> => {
    const result = p._run(ctx);
    if (result === null) {
      ctxLog(ctx, msg ?? `expected ${p.debugName}`);
      throw new ParseError();
    }
    return result as ParserResultFromArg<T | string, N>; // TODO rm cast?
  });
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
export function withSep<T, N extends NameRecord>(
  sep: CombinatorArgOld<any, NameRecord>,
  p: Parser<T, N>,
  opts: WithSepOptions = {}
): Parser<T[], N> {
  const elem = Symbol();
  const { trailing = true, requireOne = false } = opts;
  const first = requireOne ? p : opt(p);
  const last = trailing ? opt(sep) : yes();

  return seq(first.named(elem), repeat(seq(sep, p.named(elem))), last)
    .map((r) => r.named[elem] as T[])
    .traceName("withSep") as any; // TODO typing
}

/** run a parser with a provided token matcher (i.e. use a temporary lexing mode) */
export function tokens<T, N extends NameRecord>(
  matcher: TokenMatcher,
  arg: CombinatorArgOld<T, N>
): Parser<T | string> {
  const p = parserArg(arg);
  return parser(
    `tokens ${matcher._traceName}`,
    (state: ParserContext): OptParserResult<T | string, N> => {
      return state.lexer.withMatcher(matcher, () => {
        return p._run(state);
      });
    }
  );
}

/** return a parser that matches end of line, or end of file,
 * optionally preceded by white space
 * @param ws should not match \n */
export function makeEolf(matcher: TokenMatcher, ws: string): Parser<any> {
  // prettier-ignore
  return tokens(matcher, 
      tokenSkipSet(null, // disable automatic ws skipping so we can match newline
        seq(
          opt(kind(ws)), 
          or("\n", eof())
        )
      )
    )
   .traceName("eolf");
}

/** convert naked string arguments into text() parsers and functions into fn() parsers */
export function parserArg<T, N extends NameRecord>(
  arg: CombinatorArgOld<T, N>
): Parser<T, N> | Parser<string, NoNameRecord> {
  if (typeof arg === "string") {
    return text(arg) as Parser<string, NoNameRecord>;
  } else if (arg instanceof Parser) {
    return arg;
  }
  // else arg:() => Parser<T, N>
  const fnArg: () => Parser<T, N> = arg;
  return fn(fnArg);
}
