import {
  logCatch,
  testParse,
  testTokens,
  withTracingDisabled,
} from "mini-parse/test-util";
import { expect, test } from "vitest";
import {
  disablePreParse,
  NoTags,
  Parser,
  preParse,
  setTraceName,
} from "../Parser.js";
import {
  any,
  anyNot,
  kind,
  not,
  opt,
  or,
  repeat,
  repeatPlus,
  repeatWhile,
  req,
  seq,
  text,
  withSep,
  withTags,
} from "../ParserCombinator.js";
import { enableTracing } from "../ParserTracing.js";
import { withLogger } from "../WrappedLog.js";

const m = testTokens;

test("or() finds first match", () => {
  const src = "#import";
  const p = or("#import", "//");
  const { parsed, position } = testParse(p, src);
  expect(parsed?.value).toEqual("#import");
  expect(position).toEqual(src.length);
});

test("or() finds second match", () => {
  const src = "// #import";
  const p = or("#import", "//");
  const { parsed, position } = testParse(p, src);
  expect(parsed?.value).toEqual("//");
  expect(position).toEqual("//".length);
});

test("or() finds no match ", () => {
  const src = "fn decl() {}";
  const p = or("#import", "//");
  const { parsed, position } = testParse(p, src);
  expect(parsed).toEqual(null);
  expect(position).toEqual(0);
});

test("seq() returns null with partial match", () => {
  const src = "#import";
  const p = seq("#import", kind("word"));
  const { parsed, position } = testParse(p, src);
  expect(parsed).toEqual(null);
  expect(position).toEqual(0);
});

test("seq() handles two element match", () => {
  const src = "#import foo";
  const p = seq("#import", kind(m.word));
  const { parsed } = testParse(p, src);
  expect(parsed).toMatchSnapshot();
});

test("tagged kind match", () => {
  const src = "foo";
  const p = kind(m.word).tag("nn");
  const { parsed } = testParse(p, src);
  expect(parsed?.tags.nn).toEqual(["foo"]);
});

test("seq() with tagged result", () => {
  const src = "#import foo";
  const p = seq("#import", kind(m.word).tag("yo"));
  const { parsed } = testParse(p, src);
  expect(parsed?.tags.yo).toEqual(["foo"]);
});

test("opt() makes failing match ok", () => {
  const src = "foo";
  const p = seq(opt("#import"), kind("word"));
  const { parsed } = testParse(p, src);
  expect(parsed).not.toBeNull();
  expect(parsed).toMatchSnapshot();
});

test("repeat() to (1,2,3,4) via tag", () => {
  const src = "(1,2,3,4)";
  const wordNum = or(kind("word"), kind("digits")).tag("wn");
  const params = seq(opt(wordNum), opt(repeat(seq(",", wordNum))));
  const p = seq("(", params, ")");
  const { parsed } = testParse(p, src);
  expect(parsed).not.toBeNull();
  expect(parsed?.tags.wn).toEqual(["1", "2", "3", "4"]);
});

test("map()", () => {
  const src = "foo";
  const p = kind(m.word)
    .tag("word")
    .map(r => (r.tags.word?.[0] === "foo" ? "found" : "missed"));
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toBe("found");
});

test("toParser()", () => {
  const src = "foo !";
  const bang = text("!").tag("bang");
  const p = kind("word")
    .tag("word")
    .toParser(() => bang);
  const { parsed } = testParse(p, src);
  expect(parsed?.tags.bang).toEqual(["!"]);
});

test("not() success", () => {
  const src = "foo bar";
  const p = repeat(seq(not("{"), any()));
  const { parsed } = testParse(p, src);

  const values = parsed!.value;
  expect(values).toMatchSnapshot();
});

test("not() failure", () => {
  const src = "foo";
  const p = not(kind(m.word));
  const { parsed } = testParse(p, src);
  expect(parsed).toBeNull();
});

test("recurse with fn()", () => {
  const src = "{ a { b } }";
  const p: Parser<any> = seq(
    "{",
    repeat(or(kind(m.word).tag("word"), () => p)),
    "}",
  );
  const wrap = or(p).map(r => r.app.stable.push(r.tags.word));
  const { stable } = testParse(wrap, src);
  expect(stable[0]).toEqual(["a", "b"]);
});

test("tracing", () => {
  const src = "a";
  const { log, logged } = logCatch();
  const p = repeat(seq(kind(m.word)).traceName("wordz")).trace();

  enableTracing();
  withLogger(log, () => {
    testParse(p, src);
  });
  expect(logged()).toMatchSnapshot();
});

test("infinite loop detection", () => {
  const p = repeat(not("x"));
  const { log, logged } = logCatch();

  withLogger(log, () => {
    testParse(p, "y");
  });

  expect(logged()).toContain("infinite");
});

test("preparse simple comment", () => {
  // prettier-ignore
  const pre = seq(
    "/*", 
    repeat(anyNot("*/")), 
    "*/"
  ).traceName("pre");
  const p = preParse(pre, repeat(kind(m.word)));
  const src = "boo /* bar */ baz";

  const { parsed } = testParse(p, src);
  expect(parsed?.value).toEqual(["boo", "baz"]);
});

test("token start is after ignored ws", () => {
  const src = " a";
  const p = kind(m.word).map(r => r.start);
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toBe(1);
});

test("req logs a message on failure", () => {
  const src = "a 1;";
  const p = seq("a", req("b"));
  const { log, logged } = logCatch();

  withLogger(log, () => {
    testParse(p, src);
  });
  expect(logged()).toMatchInlineSnapshot(`
    "expected 'b' collect > seq > req
    a 1;   Ln 1
     ^"
  `);
});

test("repeatWhile", () => {
  let count = 0;
  const p = repeatWhile("a", () => count++ < 2);
  const src = "a a a a";
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toEqual(["a", "a"]);
});

test("repeat1", () => {
  const p = repeatPlus("a");
  const src = "a a";
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toEqual(["a", "a"]);
});

test("repeat1 fails", () => {
  const p = repeatPlus("a");
  const src = "b";
  const { parsed } = testParse(p, src);
  expect(parsed?.value).toBeUndefined();
});

test("withTags blocks tags accumulation", () => {
  const p = withTags(
    kind(m.word)
      .tag("w")
      .map(r => r.tags.w),
  );
  const s = seq(p.tag("w")).map(r => r.tags.w);

  const { parsed } = testParse(s, "a b");
  expect(parsed?.value).toEqual([["a"]]); // a prev bug returned ["a", [["a"]]]
});

test("withTags blocks tags from map()", () => {
  const p = kind(m.word).tag("w");
  // w/o clearing tags
  let taggedTags;
  const tagged = p.map(r => (taggedTags = r.tags));
  testParse(tagged, "foo");

  // w/ clearing tags
  let clearedTags;
  const c: Parser<string, NoTags> = withTags(p); // verifies return type is correct
  const cleared = c.map(r => (clearedTags = r.tags));
  testParse(cleared, "foo");

  expect(taggedTags).toEqual({ w: ["foo"] });
  expect(clearedTags).toEqual({});
});

test("withSep", () => {
  const src = "a, b, c";
  const p = withSep(",", kind(m.word).tag("w"));
  const result = testParse(p, src);
  expect(result.parsed?.tags).toEqual({ w: ["a", "b", "c"] });
});

test("tag follows setTraceName of orig", () => {
  const orig = kind(m.word);
  const tagged = orig.tag("w");
  setTraceName(orig, "orig");
  expect(tagged.debugName).toBe("orig (kind 'word')");
});
