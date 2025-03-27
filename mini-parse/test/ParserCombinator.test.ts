import {
  logCatch,
  type TestMatcherKind,
  testParse,
} from "../test-util/index.ts";
import { expect } from "vitest";
import type { Parser } from "../Parser.ts";
import {
  any,
  delimited,
  kind,
  not,
  opt,
  or,
  preceded,
  repeat,
  repeatPlus,
  repeatWhile,
  req,
  seq,
  span,
  text,
  withSep,
} from "../ParserCombinator.ts";
import { enableTracing } from "../ParserTracing.ts";
import type { Stream, Token } from "../Stream.ts";
import { withLogger } from "../WrappedLog.ts";
import { assertSnapshot } from "@std/testing/snapshot";

const m: Record<TestMatcherKind, TestMatcherKind> = {
  attr: "attr",
  digits: "digits",
  directive: "directive",
  symbol: "symbol",
  word: "word",
  ws: "ws",
};

Deno.test("or() finds first match", () => {
  const src = "#import";
  const p = or("#import", "//");
  const { parsed, position } = testParse(p, src);
  expect(parsed?.value).toEqual("#import");
  expect(position).toEqual(src.length);
});

Deno.test("or() finds second match", () => {
  const src = "// #import";
  const p = or("#import", "//");
  const { parsed, position } = testParse(p, src);
  expect(parsed?.value).toEqual("//");
  expect(position).toEqual("//".length);
});

Deno.test("or() finds no match ", () => {
  const src = "fn decl() {}";
  const p = or("#import", "//");
  const { parsed, position } = testParse(p, src);
  expect(parsed).toEqual(null);
  expect(position).toEqual(0);
});

Deno.test("seq() returns null with partial match", () => {
  const src = "#import";
  const p = seq("#import", kind("word"));
  const { parsed, position } = testParse(p, src);
  expect(parsed).toEqual(null);
  // Implementation detail regarding how parsers backtrack. This value could change
  expect(position).toEqual(7);
});

Deno.test("seq() handles two element match", async (t) => {
  const src = "#import foo";
  const p = seq("#import", kind(m.word));
  const { parsed } = testParse(p, src);
  await assertSnapshot(t, parsed);
});

Deno.test("opt() makes failing match ok", async (t) => {
  const src = "foo";
  const p = seq(opt("#import"), kind("word"));
  const { parsed } = testParse(p, src);
  expect(parsed).not.toBeNull();
  await assertSnapshot(t, parsed);
});

Deno.test("repeat() to (1,2,3,4)", () => {
  const src = "(1,2,3,4)";
  const wordNum = or(kind("word"), kind("digits"));
  const params = seq(opt(wordNum), opt(repeat(preceded(",", wordNum))));
  const p = delimited("(", params, ")");
  const { parsed } = testParse(p, src);
  expect(parsed).not.toBeNull();
  expect(parsed?.value).toEqual(["1", ["2", "3", "4"]]);
});

Deno.test("map()", () => {
  const src = "foo";
  const p = kind(m.word).map((r) => (r === "foo" ? "found" : "missed"));
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toBe("found");
});

Deno.test("toParser()", () => {
  const src = "foo !";
  const bang = text("!");
  const p = kind("word").toParser(() => bang);
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toEqual("!");
});

Deno.test("not() success", async (t) => {
  const src = "foo bar";
  const p = repeat(seq(not("{"), any()));
  const { parsed } = testParse(p, src);

  const values = parsed!.value;
  await assertSnapshot(t, values);
});

Deno.test("not() failure", () => {
  const src = "foo";
  const p = not(kind(m.word));
  const { parsed } = testParse(p, src);
  expect(parsed).toBeNull();
});

Deno.test("recurse with fn()", () => {
  const src = "{ a { b } }";
  const p: Parser<Stream<Token>, string[]> = delimited(
    "{",
    repeat(or(kind(m.word), () => p)).map((v) => v.flat()),
    "}",
  );
  const wrap = or(p);
  const { parsed } = testParse(wrap, src);
  expect(parsed?.value).toEqual(["a", "b"]);
});

Deno.test("tracing", async (t) => {
  const src = "a";
  const { log, logged } = logCatch();
  enableTracing();
  const p = repeat(seq(kind(m.word)).setTraceName("wordz")).setTrace();

  withLogger(log, () => {
    testParse(p, src);
  });
  await assertSnapshot(t, logged());
});

Deno.test("infinite loop detection", () => {
  const p = repeat(not("x"));
  expect(() => {
    testParse(p, "y");
  }).toThrow("infinite loop");
});

Deno.test("token start is after ignored ws", () => {
  const src = " a";
  const p = span(kind(m.word));
  const { parsed } = testParse(p, src);
  expect(parsed?.value?.span).toEqual([1, 2]);
});

Deno.test("req logs a message on failure", () => {
  const src = "a 1;";
  const p = seq("a", req("b", "expected 'b'"));
  expect(() => {
    testParse(p, src);
  }).toThrow("expected 'b'");
});

Deno.test("repeatWhile", () => {
  let count = 0;
  const p = repeatWhile("a", () => count++ < 2);
  const src = "a a a a";
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toEqual(["a", "a"]);
});

Deno.test("repeat1", () => {
  const p = repeatPlus("a");
  const src = "a a";
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toEqual(["a", "a"]);
});

Deno.test("repeat1 fails", () => {
  const p = repeatPlus("a");
  const src = "b";
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toBeUndefined();
});

Deno.test("withSep", () => {
  const src = "a, b, c";
  const p = withSep(",", kind(m.word));
  const result = testParse(p, src);
  expect(result.parsed?.value).toEqual(["a", "b", "c"]);
});
