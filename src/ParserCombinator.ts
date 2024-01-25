import { srcErr } from "./LinkerUtil.js";
import { quotedText } from "./MatchingLexer.js";
import {
  OptParserResult,
  Parser,
  ParserContext,
  ParserResult,
  parser,
  simpleParser,
} from "./Parser.js";
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

/** parser combinators like or() and seq() combine other stages (strings are converted to kind() parsers) */
export type CombinatorArg<T> = Parser<T> | string;

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
export function text(value: string): Parser<string> {
  return simpleParser(
    `text ${quotedText(value)}'`,
    (state: ParserContext): string | null => {
      const next = state.lexer.next();
      return next?.text === value ? next.text : null;
    }
  );
}

/** Try parsing with one or more parsers,
 *  @return the first successful parse */
export function or<T = Token>(a: CombinatorArg<T>): Parser<T>;
export function or<T = Token, U = Token>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>
): Parser<T | U>;
export function or<T = Token, U = Token, V = Token>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>,
  c: CombinatorArg<V>
): Parser<T | U | V>;
export function or<T = Token, U = Token, V = Token, W = Token>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>,
  c: CombinatorArg<V>,
  d: CombinatorArg<W>
): Parser<T | U | V | W>;
export function or<T = Token, U = Token, V = Token, W = Token, X = Token>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>,
  c: CombinatorArg<V>,
  d: CombinatorArg<W>,
  e: CombinatorArg<X>
): Parser<T | U | V | W | X>;
export function or<
  T = Token,
  U = Token,
  V = Token,
  W = Token,
  X = Token,
  Y = Token
>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>,
  c: CombinatorArg<V>,
  d: CombinatorArg<W>,
  e: CombinatorArg<X>,
  f: CombinatorArg<Y>
): Parser<T | U | V | W | X | Y>;
export function or(...stages: CombinatorArg<any>[]): Parser<any> {
  return parser("or", (state: ParserContext): ParserResult<any> | null => {
    for (const stage of stages) {
      const parser = parserArg(stage);
      const result = parser._run(state);
      if (result !== null) {
        return result;
      }
    }
    return null;
  });
}

/** Parse a sequence of parsers
 * @return an array of all parsed results, or null if any parser fails */
export function seq<T = Token, U = Token>(a: CombinatorArg<T>): Parser<[T]>;
export function seq<T = Token, U = Token>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>
): Parser<[T, U]>;
export function seq<T = Token, U = Token, V = Token>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>,
  c: CombinatorArg<V>
): Parser<[T, U, V]>;
export function seq<T = Token, U = Token, V = Token, W = Token>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>,
  c: CombinatorArg<V>,
  d: CombinatorArg<W>
): Parser<[T, U, V, W]>;
export function seq<T = Token, U = Token, V = Token, W = Token, X = Token>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>,
  c: CombinatorArg<V>,
  d: CombinatorArg<W>,
  e: CombinatorArg<X>
): Parser<[T, U, V, W, X]>;
export function seq<
  T = Token,
  U = Token,
  V = Token,
  W = Token,
  X = Token,
  Y = Token
>(
  a: CombinatorArg<T>,
  b: CombinatorArg<U>,
  c: CombinatorArg<V>,
  d: CombinatorArg<W>,
  e: CombinatorArg<X>,
  f: CombinatorArg<Y>
): Parser<[T, U, V, W, X, Y]>;
export function seq(...stages: CombinatorArg<any>[]): Parser<any[]>;
export function seq(...stages: CombinatorArg<any>[]): Parser<any[]> {
  return parser("seq", (state: ParserContext) => {
    const values = [];
    let namedResults = {};
    for (const stage of stages) {
      const parser = parserArg(stage);
      const result = parser._run(state);
      if (result === null) return null;

      namedResults = mergeNamed(namedResults, result.named);
      values.push(result.value);
    }
    return { value: values, named: namedResults };
  });
}

/** Try a parser.
 *
 * If the parse succeeds, return the result.
 * If the parser fails, return false and don't advance the input. Returning false
 * indicates a successful parse, so combinators like seq() will succeed.
 */
export function opt<T>(stage: string): Parser<string | boolean>;
export function opt<T>(stage: Parser<T>): Parser<T | boolean>;
export function opt<T>(stage: CombinatorArg<T>): Parser<T | string | boolean> {
  return parser(
    "opt",
    (state: ParserContext): OptParserResult<T | string | boolean> => {
      const parser = parserArg(stage);
      const result = parser._run(state);
      return result || { value: false, named: {} };
    }
  );
}

/** return true if the provided parser _doesn't_ match
 * does not consume any tokens
 * */
export function not<T>(stage: CombinatorArg<T>): Parser<true> {
  return parser("not", (state: ParserContext): OptParserResult<true> => {
    const pos = state.lexer.position();
    const result = parserArg(stage)._run(state);
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

export function anyNot<T>(arg: CombinatorArg<T>): Parser<Token> {
  return seq(not(arg), any())
    .map((r) => r.value[1])
    .traceName("anyNot");
}

/** match everything until a terminator (and the terminator too)
 * including optional embedded comments */
export function anyThrough(arg: CombinatorArg<any>): Parser<any> {
  return seq(repeat(anyNot(arg)), arg);
}

export function repeat(stage: string): Parser<string[]>;
export function repeat<T>(stage: Parser<T>): Parser<T[]>;
export function repeat<T>(stage: CombinatorArg<T>): Parser<(T | string)[]> {
  return parser(
    "repeat",
    (state: ParserContext): OptParserResult<(T | string)[]> => {
      const values: (T | string)[] = [];
      let results = {};
      while (true) {
        const parser = parserArg(stage);
        const result = parser._run(state);
        if (result !== null) {
          values.push(result.value);
          results = mergeNamed(results, result.named);
        } else {
          return { value: values, named: results };
        }
      }
    }
  );
}

/** A delayed parser definition, for making recursive parser definitions. */
export function fn<T>(fn: () => Parser<T>): Parser<T | string> {
  return parser("fn", (state: ParserContext): OptParserResult<T | string> => {
    const stage = parserArg(fn());
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
export function req<T>(
  arg: CombinatorArg<T>,
  msg?: string
): Parser<T | string> {
  return parser(
    "expect",
    (ctx: ParserContext): OptParserResult<T | string> => {
      const parser = parserArg(arg);
      const result = parser._run(ctx);
      if (result === null) {
        const m = msg ?? `expected ${parser.debugName}`;
        srcErr(ctx.lexer.src, ctx.lexer.position(), m);
        throw new ParseError();
      }
      return result;
    }
  );
}

export class ParseError extends Error {
  constructor(msg?: string) {
    super(msg);
  }
}

/** match an optional series of elements separated by a delimiter (e.g. a comma) */
export function withSep<T>(sep: CombinatorArg<any>, p: Parser<T>): Parser<T[]> {
  const elem = Symbol("elem");
  return seq(p.named(elem), repeat(seq(sep, p.named(elem))))
    .map((r) => r.named[elem] as T[])
    .traceName("withSep");
}

/** convert naked string arguments into text() parsers */
export function parserArg<T>(
  arg: CombinatorArg<T>
): Parser<T> | Parser<string> {
  return typeof arg === "string" ? text(arg) : arg;
}
