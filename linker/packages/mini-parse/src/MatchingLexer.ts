import { srcTrace } from "./ParserLogging.js";
import { tracing } from "./ParserTracing.js";
import { Span } from "./Span.js";
import { SrcMap } from "./SrcMap.js";
import { Stream, Token } from "./Stream.js";
import { FilterStream } from "./stream/FilterStream.js";
import { MatchersStream, RegexMatchers } from "./stream/MatchersStream.js";

/** Legacy interface, to be superseded by the Stream */
export interface Lexer {
  /** return the next token, advancing the the current position */
  next(): Token | undefined;

  /** get or set the current position in the src */
  position(pos?: number): number;

  /** skip past any ignored tokens and return the current position in the src */
  skipIgnored(): number;

  /** src text */
  src: string;

  stream?: Stream<Token>;
}

/** Legacy function, to be superseded by the Stream */
export class LexerFromStream<T extends Token> implements Lexer {
  constructor(
    public stream: Stream<T>,
    public src: string,
  ) {}
  next(): Token | undefined {
    const result = this.stream.nextToken();
    if (result === null) return undefined;
    return result;
  }
  position(pos?: number): number {
    if (pos !== undefined) {
      this.stream.reset(pos);
    }
    return this.stream.checkpoint();
  }
  skipIgnored(): number {
    const result = this.stream.nextToken();
    if (result === null) {
      // Position of EOF
      return this.stream.checkpoint();
    } else {
      this.stream.reset(result.span[0]);
      return this.stream.checkpoint();
    }
  }
}

export function matchingLexer(
  src: string,
  rootMatcher: RegexMatchers<string>,
  ignoreWs = true,
): Lexer {
  const innerStream = new MatchersStream(src, rootMatcher);
  const stream =
    ignoreWs ?
      new FilterStream(innerStream, t => t.kind !== "ws")
    : innerStream;
  return new LexerFromStream(stream, src);
}

export function quotedText(text?: string): string {
  return text ? `'${text.replace(/\n/g, "\\n")}'` : "";
}
