import { CombinatorArg, ResultFromArg } from "./CombinatorTypes.js";
import {
  AppState,
  OptParserResult,
  parser,
  Parser,
  ParserContext,
  ParserStream,
} from "./Parser.js";
import { parserArg } from "./ParserCombinator.js";
import { Stream, Token } from "./Stream.js";

export type TagRecord = Record<string | symbol, any[] | undefined>;
export type NoTags = Record<string | symbol, never>;

/** an entry in the table of deferred functions for collect() and tag() */
export interface CollectFnEntry<V> {
  collectFn: CollectFn<V>;
  srcPosition: CollectPosition;
  debugName?: string;
}

/** location in the source where a collection occurred */
export interface CollectPosition {
  start: number;
  end: number;
}

/** info passed to the collect fn */
export interface CollectContext extends CollectPosition {
  tags: TagRecord;
  src: string;
  app: AppState<any, any>;
  _values: CollectValue[];
}

/** a stack of collected values  */
interface CollectValue {
  value: any;
  openArray: any[] | undefined;
}

/** a user supplied function for collecting info from the parse */
export type CollectFn<V> = (ctx: CollectContext) => V | null;

/** a user supplied pair functions for collecting info from the parse */
export interface CollectPair<V> {
  before: CollectFn<void>;
  after: CollectFn<V>;
}

/** Queue a collection function that runs later, when a commit() is parsed.
 * Collection functions are dropped with parser backtracking, so
 * only succsessful parses are collected.
 *
 * optionally tag the collection results
 * */
export function collect<I, T, V>(
  p: Parser<I, T>,
  collectFn: CollectFn<V> | CollectPair<V>,
  ctag?: string,
): Parser<I, T> {
  const origAfter: CollectFn<V> =
    (collectFn as CollectPair<V>)?.after ?? collectFn;
  const beforeFn = (collectFn as Partial<CollectPair<V>>)?.before;

  let afterFn = origAfter;
  if (ctag) {
    afterFn = (cc: CollectContext) => {
      const result = origAfter(cc);
      if (result !== undefined && result !== null) {
        addTagValue(cc.tags, ctag, result);
      }
      return result;
    };
  }

  const debugName = ctag ? `${p.debugName}-${ctag}` : `${p.debugName}`;
  return parser(
    `collect`,
    function _collect(ctx: ParserContext): OptParserResult<T> {
      // if (tracing && ctx._trace) {
      // const deepName = ctx._debugNames.join(" > ");
      // ctxLog(ctx, `collect ${deepName}`);
      // }
      const origStart = ctx.stream.checkpoint();
      if (beforeFn) {
        queueCollectFn(ctx, origStart, beforeFn, `${debugName}.before`);
      }

      return runAndCollectAfter(p, ctx, afterFn, debugName);
    },
  );
}

export function tagScope<A extends CombinatorArg>(
  arg: A,
): Parser<ParserStream, ResultFromArg<A>> {
  const p = parserArg(arg);
  return parser(
    `tagScope`,
    function _tagScope(ctx: ParserContext): OptParserResult<ResultFromArg<A>> {
      const origStart = ctx.stream.checkpoint();
      let origTags: TagRecord;
      queueCollectFn(
        ctx,
        origStart,
        (cc: CollectContext) => {
          origTags = cloneTags(cc.tags);
          cc.tags = {};
        },
        `scope.before ${p.debugName}`,
      );
      return runAndCollectAfter(
        p,
        ctx,
        (cc: CollectContext) => {
          cc.tags = origTags;
        },
        `tagScope`,
      );
    },
  );
}

/** duplicate a tags record */
function cloneTags(tags: TagRecord): TagRecord {
  const cloned = Object.entries(tags).map(([tag, values]) => {
    return [tag, [...values!]];
  });
  return Object.fromEntries(cloned);
}

/** tag most recent collect result with a name that can be
 * referenced in later collection. */
export function ctag<I, T>(p: Parser<I, T>, name: string): Parser<I, T> {
  return parser(`ctag`, function _ctag(ctx: ParserContext): OptParserResult<T> {
    return runAndCollectAfter(
      p,
      ctx,
      (cc: CollectContext) => {
        const valueEntry = last(cc._values);
        addTagValue(cc.tags, name, valueEntry.value);
      },
      `ctag ${name}`,
    );
  });
}

/** run the parser and if it succeeds, queue a provided function to run
 * during commit() */
function runAndCollectAfter<I, T>(
  p: Parser<I, T>,
  ctx: ParserContext,
  collectFn: CollectFn<any>,
  debugName: string = "",
): OptParserResult<T> {
  const origStart = ctx.stream.checkpoint();
  const result = p._run(ctx);
  if (result) {
    queueCollectFn(ctx, origStart, collectFn, debugName);
  }
  return result;
}

function queueCollectFn<T>(
  ctx: ParserContext,
  origStart: number,
  collectFn: CollectFn<any>,
  debugName: string,
) {
  const srcPosition = refinePosition(ctx.stream, origStart);
  ctx._collect.push({
    srcPosition,
    collectFn,
    debugName,
  });
}

export function pushOpenArray(cc: CollectContext): void {
  cc._values.push({ value: null, openArray: [] });
}

export function closeArray(cc: CollectContext): void {
  const lastValue = last(cc._values);
  if (lastValue.openArray === undefined)
    console.log("---closeArray: no open array");
  cc._values.pop();
  saveCollectValue(cc, lastValue.openArray);
}

/** tag parse results results with a name that can be
 * referenced in later collection. */
export function ptag<I, T>(p: Parser<I, T>, name: string): Parser<I, T> {
  return parser(`ptag`, function _ptag(ctx: ParserContext): OptParserResult<T> {
    const origStart = ctx.stream.checkpoint();
    const result = p._run(ctx);

    // tag the parser resuts
    if (result) {
      const tagFn = (ctx: CollectContext) =>
        addTagValue(ctx.tags, name, result.value);
      queueCollectFn(ctx, origStart, tagFn, `ptag ${name}`);
    }
    return result;
  });
}

/** add a tagged value to a TagRecord */
function addTagValue(tags: TagRecord, name: string, value: any) {
  if (tags[name] === undefined) {
    tags[name] = [];
  }
  tags[name].push(value);
}

/** When the provided parser succeeds,
 * run any pending collect() fns */
export function runCollection(
  _collect: CollectFnEntry<any>[],
  app: AppState<any, any>,
  stream: Stream<Token>,
) {
  const tags: Record<string, any> = {};
  const { src } = stream;
  const _values: CollectValue[] = [{ value: null, openArray: undefined }];
  // ctx._collect.forEach(entry => {
  //   dlog("collect-list", entry.debugName)
  // });
  const collectContext: CollectContext = {
    tags,
    src,
    start: -1,
    end: -1,
    app,
    _values,
  };
  _collect.forEach(entry => {
    // dlog("commit", {
    //   entryName: entry.debugName,
    //   entryFn: entry.collectFn,
    // });
    const { collectFn, srcPosition } = entry;
    collectContext.start = srcPosition.start;
    collectContext.end = srcPosition.end;
    const collectResult = collectFn(collectContext);
    saveCollectValue(collectContext, collectResult);
  });
}

function saveCollectValue(cc: CollectContext, value: any) {
  if (value !== undefined) {
    const valueEntry = last(cc._values);
    if (!valueEntry) console.log("----saveCollectValue: no valueEntry");
    if (valueEntry) valueEntry.value = value;
    if (valueEntry?.openArray !== undefined) {
      valueEntry.openArray.push(value);
    }
  }
}

function last<T>(elems: T[]): T {
  return elems[elems.length - 1];
}

/** We've succeeded in a parse, so refine the start position to skip past ws
 * (we don't consume ws earlier, in case an inner parser wants to use different ws skipping)
 */
function refinePosition(
  stream: Stream<Token>,
  origStart: number,
): CollectPosition {
  const end = stream.checkpoint();
  stream.reset(origStart);
  const start = skipIgnored(stream);
  stream.reset(end);
  return { start: start, end };
}

function skipIgnored(stream: Stream<Token>): number {
  const result = stream.nextToken();
  if (result === null) {
    // Position of EOF
    return stream.checkpoint();
  } else {
    stream.reset(result.span[0]);
    return stream.checkpoint();
  }
}
