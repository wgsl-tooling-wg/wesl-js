import { expect, test } from "vitest";
import {
  MatchersStream,
  RegexMatchers,
  Stream,
  StreamWithLocation,
  StringToken,
} from "../Stream";
import { PeekStream } from "../stream/PeekStream";
import {
  makeTokenMatchers,
  no,
  opt,
  or,
  repeat,
  seq,
  span,
  tryOr,
  yes,
} from "../Parser2Combinator";
import { ArrayStream } from "../stream/ArrayStream";

type TestKinds = "symbol" | "keyword" | "ws";
type TestStream = Stream<StringToken<TestKinds>> & StreamWithLocation;
function makeStream(): TestStream {
  const testMatchers = new RegexMatchers<TestKinds>({
    ws: /\s+/,
    symbol: /[+\-*]/,
    keyword: /\w+/,
  });
  return new PeekStream(new MatchersStream("foo +bar   -*neko", testMatchers));
}

const { token, tryToken, eof } = makeTokenMatchers<
  TestStream,
  TestKinds,
  string
>();

test("token matchers", () => {
  const stream = makeStream();
  const a = token("keyword", "foo").parseNext(stream);
  expect(a?.value.value).toBe("foo");
  const b = token("ws").parseNext(stream);
  expect(b?.value.value).toBe(" ");
});

test("seq parser", () => {
  const stream = makeStream();
  const result = seq(token("keyword", "foo"), token("ws")).parseNext(stream);
  const [a, b] = result!.value;
  expect(a?.value).toBe("foo");
  expect(b?.value).toBe(" ");
});

test("eof parser", () => {
  const stream = makeStream();
  const result1 = seq(token("keyword"), token("ws"), token("symbol")).parseNext(
    stream,
  );
  const result2 = seq(
    token("keyword"),
    token("ws"),
    token("symbol"),
    token("symbol"),
  ).parseNext(stream);
  const result3 = seq(token("keyword"), eof()).parseNext(stream);
  expect(result3?.value?.[0]?.value).toBe("neko");
});

test("or parser", () => {
  const stream = makeStream();
  const result = seq(
    or(tryToken("symbol", "foo"), tryToken("keyword", "foo")),
    token("ws"),
  ).parseNext(stream);
  const [a, b] = result!.value;
  expect(a?.value).toBe("foo");
  expect(b?.value).toBe(" ");
});

test("yes parser", () => {
  const stream = makeStream();
  const result = seq(yes(), yes(), token("keyword", "foo")).parseNext(stream);
  const [a, b, c] = result!.value;
  expect(a).toBe(null);
  expect(b).toBe(null);
  expect(c.value).toBe("foo");
});

test("no parser", () => {
  const stream = makeStream();
  expect(() => no().parseNext(stream)).toThrowError("NoParser");
});

test("span parser", () => {
  const stream = makeStream();
  const a = span(token("keyword")).parseNext(stream);
  const b = span(seq(token("ws"), token("symbol"))).parseNext(stream);
  expect(a?.value.span).toEqual([0, 3]);
  expect(b?.value.span).toEqual([3, 5]);
});

test("opt parser", () => {
  const stream = makeStream();
  const a = seq(
    opt(tryToken("keyword")),
    opt(tryToken("keyword")),
    token("ws"),
  ).parseNext(stream);
  expect(a?.value?.map(v => (v === null ? null : v.value))).toEqual([
    "foo",
    null,
    " ",
  ]);
});

test("map parser", () => {
  const stream = makeStream();
  const a = token("keyword")
    .map(v => v.value)
    .map(v => v[0])
    .parseNext(stream);
  expect(a?.value).toBe("f");
});

test("repeat parser", () => {
  const stream = makeStream();
  const a = seq(
    repeat(tryOr(tryToken("ws"), tryToken("keyword"))),
    token("symbol"),
  ).parseNext(stream);
  expect(a?.value.length).toBe(2);
  expect(a?.value?.[0].map(v => v.span)).toEqual([
    [0, 3],
    [3, 4],
  ]);
  expect(a?.value?.[1].value).toBe("+");
});

// TODO: separated

test("peek stream", () => {
  const stream = new PeekStream(new ArrayStream(["0", "1", "2", "3"]));
  const { token, tryToken } = makeTokenMatchers<typeof stream, "", string>();

  expect(stream.checkpoint()).toBe(0);

  const a = token("", "0").parseNext(stream);
  expect(stream.checkpoint()).toBe(1);
  expect(a?.value.value).toBe("0");

  const b = token("").parseNext(stream);
  expect(b?.value.value).toBe("1");
  expect(stream.checkpoint()).toBe(2);

  const c = tryToken("", "7").parseNext(stream);
  expect(c).toBe(null);
  expect(stream.checkpoint()).toBe(3);

  stream.reset(2);
  const d = tryToken("").parseNext(stream);
  expect(d?.value?.value).toBe("2");
  expect(stream.checkpoint()).toBe(3);
});
