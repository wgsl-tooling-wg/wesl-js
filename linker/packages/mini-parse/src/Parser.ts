import { assertThat } from "./Assertions.js";
import { CombinatorArg } from "./CombinatorTypes.js";
import {
  collect,
  CollectFn,
  CollectFnEntry,
  CollectPair,
  ctag,
  ptag,
  runCollection,
} from "./ParserCollect.js";
import { ParseError, parserArg } from "./ParserCombinator.js";
import {
  debugNames,
  parserLog,
  TraceContext,
  TraceOptions,
  tracing,
  withTraceLogging,
} from "./ParserTracing.js";
import { Stream, Token, TypedToken } from "./Stream.js";

export interface AppState<C, S> {
  /**
   * Context for user written parsers while parsing. e.g. for nested #if state
   * The context value is reset to its original value if the parser fails.
   * Set context to a new immutable value to update (don't internally mutate context)
   */
  context: C;

  /** typical place for user written parsers to accumulate results, e.g. syntax tree */
  stable: S;
}

export interface ParserInit<C = any, S = any> {
  /** supply tokens to the parser*/
  stream: Stream<Token>;

  /** application specific context and result storage, shared with every parser */
  appState?: AppState<C, S>;
}

/* Information passed to the parsers during parsing */
export interface ParserContext<C = any, S = any> {
  stream: Stream<Token>;

  app: AppState<C, S>;

  /** during execution, debug trace logging */
  _trace?: TraceContext;

  /** current parser stack or parent parsers that called this one */
  _debugNames: string[];

  _collect: CollectFnEntry<any>[];
}

/** Result from a parser */
export interface ParserResult<T> {
  /** result from this stage */
  value: T;
}

// TODO: What's the C and S?
export interface ExtendedResult<T, C = any, S = any> extends ParserResult<T> {
  app: AppState<C, S>;
}

/** parsers return null if they don't match */
// prettier-ignore
export type OptParserResult<T,> = 
    ParserResult<T> 
  | null;

/** Internal parsing functions return a value and also a set of tagged results from contained parser  */
type ParseFn<T> = (context: ParserContext) => OptParserResult<T>;

/** options for creating a core parser */
export interface ParserArgs {
  /** name to use for trace logging */
  traceName?: string;

  /** enable trace logging */
  trace?: TraceOptions;

  /** true for elements without children like kind(), and text(),
   * (to avoid intro log statement while tracing) */
  terminal?: boolean;

  /** set if the collection results are tagged */
  _children?: AnyParser[];
}

interface ConstructArgs<T> extends ParserArgs {
  fn: ParseFn<T>;
}

export type AnyParser = Parser<any, any>;

export class ParserTraceInfo {
  constructor(
    /** name to use for trace logging */
    public traceName: string | undefined = undefined,
    public traceChildren: AnyParser[] = [],
    public traceEnabled: TraceOptions | undefined = undefined,
  ) {}
  /** true for elements without children like kind(), and text(),
   * (to avoid intro log statement while tracing) */
  traceIsTerminal: boolean = false;
}

/** A parser with no requirements, a bottom type. */
export type ParserStream = Stream<TypedToken<never>>;

/**
 * a composable parsing element
 *
 * I = input stream *requirements*. For example `seq(token("keyword"), token("word"), yes())` would
 * - Require "keyword" to be a part of the token kinds
 * - Require "word" to be a part of the token kinds
 * - Not require anything for the yes() parser
 * - Inherit the "keyword" requirement and the "word" requirement for the seq parser
 *
 * These requirements are then validated when `.parseNext()` is called
 */
export class Parser<I, T> {
  /** If tracing is enabled, this exists. Otherwise it does not exist. */
  _traceInfo?: ParserTraceInfo;
  fn: ParseFn<T>;

  constructor(args: ConstructArgs<T>) {
    this.fn = args.fn;
    if (tracing) {
      this._traceInfo = new ParserTraceInfo(
        args.traceName,
        args._children,
        args.trace,
      );
      if (args.terminal) {
        this._traceInfo.traceIsTerminal = true;
      }
    }
  }

  /** run the parser given an already created parsing context */
  _run(context: ParserContext): OptParserResult<T> {
    return runParser(this, context);
  }

  /**
   * run the parser given an already created parsing context
   * Will attempt to run its child parsers in tracing mode
   */
  _runTracing(context: ParserContext, trace: TraceContext): OptParserResult<T> {
    return runParser(this, context);
  }

  /** tag parse results */
  ptag<K extends string>(name: K): Parser<I, T> {
    return ptag(this, name) as Parser<I, T>;
  }

  /** tag collect results */
  ctag<K extends string>(name: K): Parser<I, T> {
    return ctag(this, name) as Parser<I, T>;
  }

  /** record a name for debug tracing */
  setTraceName(name: string): Parser<I, T> {
    if (tracing) {
      assertThat(this._traceInfo);
      this._traceInfo.traceName = name;
    }
    return this;
  }

  /** trigger tracing for this parser (and by default also this parsers descendants) */
  setTrace(opts: TraceOptions = {}): Parser<I, T> {
    if (tracing) {
      assertThat(this._traceInfo);
      this._traceInfo.traceEnabled = opts;
    }
    return this;
  }

  /** map results to a new value, or add to app state as a side effect.
   * Return null to cause the parser to fail.
   * SAFETY: Side-effects should not be done if backtracking could occur!
   */
  mapExtended<U>(fn: ParserMapFn<T, U>): Parser<I, U> {
    return mapExtended(this, fn);
  }

  /** map results to a new value.
   */
  map<U>(fn: (value: T) => U): Parser<I, U> {
    return map(this, fn);
  }

  /** Queue a function that runs later, typically to collect AST elements from the parse.
   * when a commit() is parsed.
   * Collection functions are dropped with parser backtracking, so
   * only succsessful parses are collected. */
  collect<U>(fn: CollectFn<U> | CollectPair<U>, ctag?: string): Parser<I, T> {
    return collect(this, fn, ctag);
  }

  /** switch next parser based on results */
  toParser<U>(fn: ToParserFn<I, T, U>): Parser<I, T | U> {
    return toParser(this, fn);
  }

  /** start parsing */
  parse(init: ParserInit): OptParserResult<T> {
    try {
      const { stream, appState: app = { context: {}, stable: [] } } = init;
      const _collect: CollectFnEntry<any>[] = [];
      const result = this._run({
        stream,
        app,
        _collect,
        _debugNames: [],
      });
      if (result) runCollection(_collect, app, stream);
      return result;
    } catch (e) {
      if (e instanceof ParseError) {
        return null;
      }
      throw e;
    }
  }

  /** name of this parser for debugging/tracing */
  get debugName(): string {
    if (tracing) {
      return this._traceInfo?.traceName ?? "parser";
    }
    return "parser";
  }
}

/** Create a Parser from a ParseFn
 * @param fn the parser function
 * @param args static arguments provided by the user as the parser is constructed
 */
export function parser<I, T>(
  traceName: string,
  fn: ParseFn<T>,
  terminal?: boolean,
): Parser<I, T> {
  const terminalArg = terminal ? { terminal } : {};
  return new Parser<I, T>({ fn, traceName, ...terminalArg });
}

/** Create a Parser from a function that parses and returns a value (w/no child parsers) */
export function simpleParser<T>(
  traceName: string,
  fn: (ctx: ParserContext) => T | null | undefined,
): Parser<ParserStream, T> {
  const parserFn: ParseFn<T> = (ctx: ParserContext) => {
    const r = fn(ctx);
    if (r == null || r === undefined) return null;

    return { value: r };
  };

  return parser(traceName, parserFn, true);
}

/**
 * Execute a parser by running the core parsing fn given the parsing context
 * also:
 * . check for infinite loops
 * . log if tracing is enabled
 * . backtrack on failure
 * . rollback context on failure
 */
function runParser<I, T>(
  p: Parser<I, T>,
  context: ParserContext,
): OptParserResult<T> {
  const { stream } = context;

  const origAppContext = context.app.context;

  // setup trace logging if enabled and active for this parser
  const result = withTraceLogging<OptParserResult<T>>()(
    context,
    p._traceInfo,
    runInContext,
  );

  return result;

  function runInContext(ctx: ParserContext): OptParserResult<T> {
    const origPosition = stream.checkpoint();
    const origCollectLength = ctx._collect.length;

    if (debugNames) ctx._debugNames.push(p.debugName);
    const traceSuccessOnly = ctx._trace?.successOnly;
    if (tracing) {
      if (!p._traceInfo?.traceIsTerminal && !traceSuccessOnly) {
        parserLog(`..${p.debugName}`);
      }
    }

    // run the parser function for this stage
    let result = p.fn(ctx);

    if (debugNames) ctx._debugNames.pop();

    if (result === null || result === undefined) {
      // parser failed
      if (tracing && !traceSuccessOnly) parserLog(`x ${p.debugName}`);
      stream.reset(origPosition);
      context.app.context = origAppContext;
      result = null;
      // if (ctx._collect.length > origCollectLength) {
      //   const obsolete = ctx._collect.slice(origCollectLength);
      //   const collectNames = obsolete.map(c => c.debugName);
      //   dlog("removing", { collectNames, inParser: p.debugName });
      // }
      ctx._collect.length = origCollectLength;
    } else {
      // parser succeeded
      if (tracing) parserLog(`✓ ${p.debugName}`);
      const value = result.value;
      result = { value };
    }

    return result;
  }
}

type ParserMapFn<T, U> = (results: ExtendedResult<T>) => U | null;

/** return a parser that maps the current results */
function mapExtended<I, T, U>(
  p: Parser<I, T>,
  fn: ParserMapFn<T, U>,
): Parser<I, U> {
  const mapParser = parser(
    `mapExtended`,
    (ctx: ParserContext): OptParserResult<U> => {
      const extended = runExtended(ctx, p);
      if (!extended) return null;

      const mappedValue = fn(extended);
      if (mappedValue === null) return null;

      return { value: mappedValue };
    },
  );

  trackChildren(mapParser, p);
  return mapParser;
}

/** return a parser that maps the current results */
function map<I, T, U>(p: Parser<I, T>, fn: (value: T) => U): Parser<I, U> {
  const mapParser = parser(`map`, (ctx: ParserContext): OptParserResult<U> => {
    const result = p._run(ctx);
    if (result === null) return null;
    return { value: fn(result.value) };
  });

  trackChildren(mapParser, p);
  return mapParser;
}

type ToParserFn<I, T, X> = (
  results: ExtendedResult<T>,
) => Parser<I, X> | undefined;

function toParser<I, T, O>(
  p: Parser<I, T>,
  toParserFn: ToParserFn<I, T, O>,
): Parser<I, T | O> {
  const newParser: Parser<I, T | O> = parser(
    "toParser",
    (ctx: ParserContext) => {
      const extended = runExtended(ctx, p);
      if (!extended) return null;

      // run the supplied function to get a parser
      const newParser = toParserFn(extended);

      if (newParser === undefined) {
        return extended;
      }

      // run the parser returned by the supplied function
      const nextResult = newParser._run(ctx);
      // TODO merge names record from p to newParser
      return nextResult as any; // TODO fix typing
    },
  );
  trackChildren(newParser, p);
  return newParser;
}

/** run parser, return enriched results (to support map(), toParser()) */
export function runExtended<I, T>(
  ctx: ParserContext,
  p: Parser<I, T>,
): ExtendedResult<T> | null {
  const origStart = ctx.stream.checkpoint();

  const origResults = p._run(ctx);
  if (origResults === null) {
    ctx.stream.reset(origStart);
    return null;
  }
  const { app } = ctx;
  return { ...origResults, app };
}

/** for pretty printing, track subsidiary parsers */
export function trackChildren(p: AnyParser, ...args: CombinatorArg[]) {
  if (tracing) {
    assertThat(p._traceInfo);
    const kids = args.map(parserArg);
    p._traceInfo.traceChildren = kids;
  }
}
