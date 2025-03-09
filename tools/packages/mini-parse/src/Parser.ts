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
import { parserArg } from "./ParserCombinator.js";
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

// LATER Try merging this into the stream
/* Information passed to the parsers during parsing */
export interface ParserContext<C = any, S = any> {
  stream: Stream<Token>;

  app: AppState<C, S>;

  /** during execution, debug trace logging */
  _trace?: TraceContext;

  _collect: CollectFnEntry<any>[];
}

/** Result from a parser */
export interface ParserResult<T> {
  /** result from this stage */
  value: T;
}

export interface ExtendedResult<T, C = any, S = any> extends ParserResult<T> {
  app: AppState<C, S>;
}

/** parsers return null if they don't match */
export type OptParserResult<T> = ParserResult<T> | null;

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
    public traceEnabled: TraceOptions | undefined = undefined,
  ) {}
  /** true for elements without children like kind(), and text(),
   * (to avoid intro log statement while tracing) */
  traceIsTerminal: boolean = false;
}

/** A parser with no requirements, a bottom type. */
export type ParserStream = Stream<TypedToken<never>>;

export class ParseError extends Error {
  position: number;
  constructor(msg: string, position: number) {
    super(msg);
    this.position = position;
  }
}

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

  /** run the parser given an already created parsing context
   *
   * Execute a parser by running the core parsing fn given the parsing context
   * also:
   * . log if tracing is enabled
   * . backtrack on failure
   * . rollback context on failure
   */
  _run(context: ParserContext): OptParserResult<T> {
    if (tracing) {
      return runParserWithTracing(
        this.debugName,
        this.fn,
        context,
        this._traceInfo,
      );
    } else {
      const origAppContext = context.app.context;
      const origCollectLength = context._collect.length;
      const result = this.fn(context);
      if (result === null) {
        context.app.context = origAppContext;
        context._collect.length = origCollectLength;
      }

      return result;
    }
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

  /**
   * start parsing
   *
   * @throws {ParseError} when a combinator like `req` fails
   */
  parse(init: ParserInit): OptParserResult<T> {
    const { stream, appState: app = { context: {}, stable: [] } } = init;
    const _collect: CollectFnEntry<any>[] = [];
    const result = this._run({
      stream,
      app,
      _collect,
    });
    if (result) runCollection(_collect, app, stream);
    return result;
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
  return new Parser<I, T>({ fn, traceName, terminal: terminal });
}

/** Create a Parser from a function that parses and returns a value (w/no child parsers) */
export function terminalParser<T>(
  traceName: string,
  parserFn: ParseFn<T>,
): Parser<ParserStream, T> {
  return parser(traceName, parserFn, true);
}

function runParserWithTracing<I, T>(
  debugName: string,
  fn: ParseFn<T>,
  context: ParserContext,
  traceInfo: ParserTraceInfo | undefined,
): OptParserResult<T> {
  assertThat(tracing);
  const origAppContext = context.app.context;

  // setup trace logging if enabled and active for this parser
  const result = withTraceLogging<OptParserResult<T>>(
    context,
    traceInfo,
    runInContext,
  );

  return result;

  function runInContext(ctx: ParserContext): OptParserResult<T> {
    const origCollectLength = ctx._collect.length;

    if (tracing) {
      const traceSuccessOnly = ctx._trace?.successOnly;
      if (!traceInfo?.traceIsTerminal && !traceSuccessOnly) {
        parserLog(`..${debugName}`);
      }
    }

    // run the parser function for this stage
    let result = fn(ctx);

    if (result === null) {
      // parser failed
      if (tracing) {
        const traceSuccessOnly = ctx._trace?.successOnly;
        if (!traceSuccessOnly) {
          parserLog(`x ${debugName}`);
        }
      }
      context.app.context = origAppContext;
      ctx._collect.length = origCollectLength;
    } else {
      // parser succeeded
      if (tracing) parserLog(`✓ ${debugName}`);
    }

    return result;
  }
}

type ParserMapFn<T, U> = (results: ExtendedResult<T>) => U | null;

/** return a parser that maps the current results */
function map<I, T, U>(p: Parser<I, T>, fn: (value: T) => U): Parser<I, U> {
  return parser(`map`, function _map(ctx: ParserContext): OptParserResult<U> {
    const result = p._run(ctx);
    if (result === null) return null;
    return { value: fn(result.value) };
  });
}

type ToParserFn<I, T, X> = (results: ParserResult<T>) => Parser<I, X> | null;

function toParser<I, T, O>(
  p: Parser<I, T>,
  toParserFn: ToParserFn<I, T, O>,
): Parser<I, T | O> {
  return parser(
    "toParser",
    function _toParser(ctx: ParserContext): OptParserResult<T | O> {
      const result = p._run(ctx);
      if (result === null) return null;

      // run the supplied function to get a parser
      const newParser = toParserFn(result);

      if (newParser === null) {
        return result;
      }

      // run the parser returned by the supplied function
      const nextResult = newParser._run(ctx);
      return nextResult;
    },
  );
}
