import { expect, test } from "vitest";
import { MatchersStream, RegexMatchers, Stream, StringToken } from "../Stream";
import { PeekStream } from "../stream/PeekStream";
import { seq, token, tryToken } from "../Parser2Combinator";

type TestKinds = "symbol" | "keyword" | "ws";

function makeStream(): Stream<StringToken<TestKinds>> {
  const testMatchers = new RegexMatchers<TestKinds>({
    ws: /\s+/,
    symbol: /[+\-*]/,
    keyword: /\w+/,
  });
  return new PeekStream(new MatchersStream("foo +bar   -*neko", testMatchers));
}

test("token matchers", () => {
  const stream = makeStream();
  const a = token("keyword", "foo").parseNext(stream);
  expect(a?.value.value).toBe("foo");
  const b = token("ws").parseNext(stream);
  expect(b?.value.value).toBe(" ");
});

test("seq matcher", () => {
  const stream = makeStream();
  const result = seq(token("keyword", "foo"), token("ws")).parseNext(stream);
  const [a, b] = result!.value;
  expect(a?.value).toBe("foo");
  expect(b?.value).toBe(" ");
});
