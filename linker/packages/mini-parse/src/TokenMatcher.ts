import { Stream, Token, TypedToken } from "./Stream.js";
import { CachingStream } from "./stream/CachingStream.js";
import { MatchersStream, RegexMatchers } from "./stream/MatchersStream.js";

/** a TokenMatcher with each token kind exposed as a string property */
export type FullTokenMatcher<T> = TokenMatcher & {
  [Property in keyof T]: string;
};

/** Legacy interface, to be superseded by the Stream */
export interface TokenMatcher {
  start(src: string, position?: number): Stream<Token>;
  next(): Token | undefined;
  get position(): number;
  set position(position: number);
  _debugName?: string;
}
/** Legacy function, to be superseded by the Stream */
export function tokenMatcher<T extends Record<string, string | RegExp>>(
  matchers: T,
  debugName = "matcher",
): FullTokenMatcher<T> {
  const regexMatchers = new RegexMatchers(matchers);
  let stream: Stream<Token> | null = null;
  let src: string;

  function start(text: string, position = 0): Stream<Token> {
    if (src !== text || stream === null) {
      stream = new CachingStream(new MatchersStream(text, regexMatchers));
    }

    src = text;
    stream.reset(position);
    return stream;
  }

  function next(): Token | undefined {
    if (stream === null) {
      throw new Error("start() first");
    }
    const token = stream.nextToken();
    if (token === null) {
      return undefined;
    }
    return {
      kind: token.kind,
      text: token.text,
      span: token.span,
    };
  }

  const groups: string[] = Object.keys(matchers);
  const keys = Object.fromEntries(groups.map(k => [k, k]));
  return {
    ...keys,
    start,
    next,
    get position(): number {
      if (stream === null) throw new Error("start() first");
      return stream.checkpoint();
    },
    set position(pos: number) {
      if (stream === null) throw new Error("start() first");
      stream.reset(pos);
    },
    _debugName: debugName,
  } as FullTokenMatcher<T>;
}
