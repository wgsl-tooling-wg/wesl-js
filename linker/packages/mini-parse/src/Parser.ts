import { CombinatorArg, ParserFromArg } from "./CombinatorTypes.js";
import { Lexer } from "./MatchingLexer.js";
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
import { srcLog } from "./ParserLogging.js";
import {
  debugNames,
  parserLog,
  TraceContext,
  TraceOptions,
  tracing,
  withTraceLogging,
} from "./ParserTracing.js";
import { SrcMap } from "./SrcMap.js";

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
  lexer: Lexer;

  /** application specific context and result storage, shared with every parser */
  appState?: AppState<C, S>;

  /** set this to avoid infinite looping by failing after more than this many parsing steps */
  maxParseCount?: number;
}

/* Information passed to the parsers during parsing */
export interface ParserContext<C = any, S = any> {
  lexer: Lexer;

  app: AppState<C, S>;

  maxParseCount?: number;

  /** during execution, debug trace logging */
  _trace?: TraceContext;

  /** during execution, count parse attempts to avoid infinite looping */
  _parseCount: number;

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
  src: string;
  start: number;
  end: number;
  app: AppState<C, S>;
  ctx: ParserContext<C, S>;
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
  /** name to use for result in tagged results */
  tag?: string | symbol;

  /** name to use for trace logging */
  traceName?: string;

  /** use the debugName from this source parser for trace logging */
  traceSrc?: AnyParser;

  /** enable trace logging */
  trace?: TraceOptions;

  /** true for elements without children like kind(), and text(),
   * (to avoid intro log statement while tracing) */
  terminal?: boolean;

  /** true if this is a collect parser (which .tag handles specially, to tag collect time results) */
  _collection?: true;

  /** set if the collection results are tagged */
  _children?: AnyParser[];
}

interface ConstructArgs<T> extends ParserArgs {
  fn: ParseFn<T>;
}

export type AnyParser = Parser<any>;

/** a composable parsing element */
export class Parser<T> {
  _traceName: string | undefined;
  traceSrc: AnyParser | undefined;
  tagName: string | symbol | undefined;
  traceOptions: TraceOptions | undefined;
  terminal: boolean | undefined;
  _collection: true | undefined;
  _children: AnyParser[] | undefined;
  fn: ParseFn<T>;

  constructor(args: ConstructArgs<T>) {
    this._traceName = args.traceName;
    this.tagName = args.tag;
    this.traceOptions = args.trace;
    this.terminal = args.terminal;
    this.traceSrc = args.traceSrc;
    this._collection = args._collection;
    this._children = args._children;
    this.fn = args.fn;
  }

  /** copy this parser with slightly different settings */
  _cloneWith(p: Partial<ConstructArgs<T>>): Parser<T> {
    return new Parser({
      traceName: this._traceName,
      traceSrc: this.traceSrc,
      tag: this.tagName,
      trace: this.traceOptions,
      terminal: this.terminal,
      _collection: this._collection,
      _children: this._children,
      fn: this.fn,
      ...p,
    });
  }

  /** run the parser given an already created parsing context */
  _run(context: ParserContext): OptParserResult<T> {
    return runParser(this, context);
  }

  /** tag parse results */
  ptag<K extends string>(name: K): Parser<T> {
    return ptag(this, name) as Parser<T>;
  }

  /** tag collect results */
  ctag<K extends string>(name: K): Parser<T> {
    return ctag(this, name) as Parser<T>;
  }

  /** record a name for debug tracing */
  traceName(name: string): Parser<T> {
    return this._cloneWith({ traceName: name });
  }

  /** trigger tracing for this parser (and by default also this parsers descendants) */
  trace(opts: TraceOptions = {}): Parser<T> {
    return this._cloneWith({ trace: opts });
  }

  /** map results to a new value, or add to app state as a side effect.
   * Return null to cause the parser to fail.
   * SAFETY: Side-effects should not be done if backtracking could occur!
   */
  map<U>(fn: ParserMapFn<T, U>): Parser<U> {
    return map(this, fn);
  }

  /** map results to a new value.
   * Return null to cause the parser to fail.
   */
  mapValue<U>(fn: (value: T) => U | null): Parser<U> {
    return map(this, v => fn(v.value));
  }

  /** Queue a function that runs later, typically to collect AST elements from the parse.
   * when a commit() is parsed.
   * Collection functions are dropped with parser backtracking, so
   * only succsessful parses are collected. */
  collect<U>(fn: CollectFn<U> | CollectPair<U>, ctag?: string): Parser<T> {
    return collect(this, fn, ctag);
  }

  /** switch next parser based on results */
  toParser<U>(fn: ToParserFn<T, U>): Parser<T | U> {
    return toParser(this, fn);
  }

  /** start parsing */
  parse(init: ParserInit): OptParserResult<T> {
    try {
      const {
        lexer,
        maxParseCount,
        appState: app = { context: {}, stable: [] },
      } = init;
      const _collect: CollectFnEntry<any>[] = [];
      const result = this._run({
        lexer,
        app,
        _parseCount: 0,
        maxParseCount,
        _collect,
        _debugNames: [],
      });
      if (result) runCollection(_collect, app, lexer);
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
    return (
      this._traceName ??
      this.traceSrc?._traceName ??
      this.tagName?.toString() ??
      "parser"
    );
  }
}

/** Create a Parser from a ParseFn
 * @param fn the parser function
 * @param args static arguments provided by the user as the parser is constructed
 */
export function parser<T>(
  traceName: string,
  fn: ParseFn<T>,
  terminal?: boolean,
): Parser<T> {
  const terminalArg = terminal ? { terminal } : {};
  return new Parser<T>({ fn, traceName, ...terminalArg });
}

/** Create a Parser from a function that parses and returns a value (w/no child parsers) */
export function simpleParser<T>(
  traceName: string,
  fn: (ctx: ParserContext) => T | null | undefined,
): Parser<T> {
  const parserFn: ParseFn<T> = (ctx: ParserContext) => {
    const r = fn(ctx);
    if (r == null || r === undefined) return null;

    return { value: r, tags: {} };
  };

  return parser(traceName, parserFn, true);
}

/** modify the trace name of this parser */
export function setTraceName(parser: Parser<any>, traceName: string): void {
  const origName = parser._traceName;
  parser._traceName = `${traceName} (${origName})`;
}

/**
 * Execute a parser by running the core parsing fn given the parsing context
 * also:
 * . check for infinite loops
 * . log if tracing is enabled
 * . merge tagged results
 * . backtrack on failure
 * . rollback context on failure
 */
function runParser<T>(
  p: Parser<T>,
  context: ParserContext,
): OptParserResult<T> {
  const { lexer, _parseCount = 0, maxParseCount } = context;

  // check for infinite looping
  context._parseCount = _parseCount + 1;
  // LATER counting tokens isn't so great to check for infinite looping. Possibly a count per parser per src position?
  if (maxParseCount && _parseCount > maxParseCount) {
    srcLog(lexer.src, lexer.position(), "infinite loop? ", p.debugName);
    return null;
  }

  const origAppContext = context.app.context;

  // setup trace logging if enabled and active for this parser
  const result = withTraceLogging<OptParserResult<T>>()(
    context,
    p.traceOptions,
    runInContext,
  );

  return result;

  function runInContext(ctx: ParserContext): OptParserResult<T> {
    const origPosition = lexer.position();
    const origCollectLength = ctx._collect.length;

    if (debugNames) ctx._debugNames.push(p.debugName);
    const traceSuccessOnly = ctx._trace?.successOnly;
    if (!p.terminal && tracing && !traceSuccessOnly)
      parserLog(`..${p.debugName}`);

    // run the parser function for this stage
    let result = p.fn(ctx);

    if (debugNames) ctx._debugNames.pop();

    if (result === null || result === undefined) {
      // parser failed
      if (tracing && !traceSuccessOnly) parserLog(`x ${p.debugName}`);
      lexer.position(origPosition);
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
function map<T, U>(p: Parser<T>, fn: ParserMapFn<T, U>): Parser<U> {
  const mapParser = parser(`map`, (ctx: ParserContext): OptParserResult<U> => {
    const extended = runExtended(ctx, p);
    if (!extended) return null;

    const mappedValue = fn(extended);
    if (mappedValue === null) return null;

    return { value: mappedValue };
  });

  trackChildren(mapParser, p);
  return mapParser;
}

type ToParserFn<T, X> = (results: ExtendedResult<T>) => Parser<X> | undefined;

function toParser<T, O>(
  p: Parser<T>,
  toParserFn: ToParserFn<T, O>,
): Parser<T | O> {
  const newParser: Parser<T | O> = parser("toParser", (ctx: ParserContext) => {
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
  });
  trackChildren(newParser, p);
  return newParser;
}

/** run parser, return enriched results (to support map(), toParser()) */
export function runExtended<T>(
  ctx: ParserContext,
  p: Parser<T>,
): ExtendedResult<T> | null {
  const origStart = ctx.lexer.position();

  const origResults = p._run(ctx);
  if (origResults === null) {
    ctx.lexer.position(origStart);
    return null;
  }
  const end = ctx.lexer.position();
  const src = ctx.lexer.src;

  // we've succeeded, so refine the start position to skip past ws
  // (we don't consume ws earlier, in case an inner parser wants to use different ws skipping)
  ctx.lexer.position(origStart);
  const start = ctx.lexer.skipIgnored();
  ctx.lexer.position(end);
  const { app } = ctx;

  return { ...origResults, start, end, app, src, ctx };
}

/** for pretty printing, track subsidiary parsers */
export function trackChildren(p: AnyParser, ...args: CombinatorArg[]) {
  if (tracing) {
    const kids = args.map(parserArg);
    p._children = kids;
  }
}
