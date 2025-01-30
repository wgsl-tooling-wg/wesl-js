import { srcLog } from "./ParserLogging.js";
import { Span } from "./Span.js";
import { Stream } from "./Stream.js";
import { CachingStream } from "./stream/CachingStream.js";
import { escapeRegex } from "./stream/RegexHelpers.js";
import {
  MatchersStream,
  RegexMatchers,
  StringToken,
} from "./stream/StringStream.js";

export interface OldToken {
  kind: string;
  text: string;
}

/** a TokenMatcher with each token kind exposed as a string property */
export type FullTokenMatcher<T> = TokenMatcher & {
  [Property in keyof T]: string;
};

export interface TokenMatcher {
  start(src: string, position?: number): Stream<StringToken<string>>;
  next(): OldToken | undefined;
  get position(): number;
  set position(position: number);
  _debugName?: string;
}

export function tokenMatcher<T extends Record<string, string | RegExp>>(
  matchers: T,
  debugName = "matcher",
): FullTokenMatcher<T> {
  const regexMatchers = new RegexMatchers(matchers);
  let stream: Stream<StringToken<string>> | null = null;
  let src: string;

  function start(text: string, position = 0): Stream<StringToken<string>> {
    if (src !== text || stream === null) {
      stream = new CachingStream(new MatchersStream(text, regexMatchers));
    }

    src = text;
    stream.reset(position);
    return stream;
  }

  function next(): OldToken | undefined {
    if (stream === null) {
      throw new Error("start() first");
    }
    const token = stream.nextToken();
    if (token === null) {
      return undefined;
    }
    return {
      kind: token.kind,
      text: token.value,
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
