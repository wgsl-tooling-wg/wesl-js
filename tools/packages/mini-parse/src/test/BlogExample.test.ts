import { expect, test } from "vitest";
import { assertThat } from "../Assertions.ts";
import {
  kind,
  opt,
  preceded,
  repeat,
  seq,
  seqObj,
} from "../ParserCombinator.ts";
import { FilterStream } from "../stream/FilterStream.ts";
import { MatchersStream, RegexMatchers } from "../stream/MatchersStream.ts";
import { matchOneOf } from "../stream/RegexHelpers.ts";

test("parse fn foo()", () => {
  const src = "fn foo()";

  const tokens = new RegexMatchers({
    ident: /[a-z]+/,
    ws: /\s+/,
    symbol: matchOneOf("( ) [ ] { } @ ; ,"),
  });
  const stream = new FilterStream(
    new MatchersStream(src, tokens),
    t => t.kind !== "ws",
  );

  // parsers
  const ident = kind("ident");
  const fnDecl = seq("fn", ident, "(", ")");

  // parsing and extracint result
  const result = fnDecl.parse({ stream });

  if (result) {
    const foundIdent = result.value[1];
    expect(foundIdent).toBe("foo");
  }
  expect(result).toBeDefined();
});

test("parse fn foo() with annotation in grammar", () => {
  const src = "fn foo()";

  const tokens = new RegexMatchers({
    ident: /[a-z]+/,
    ws: /\s+/,
    symbol: matchOneOf("( ) [ ] { } @ ; ,"),
  });
  const stream = new FilterStream(
    new MatchersStream(src, tokens),
    t => t.kind !== "ws",
  );

  // parsers
  const ident = kind("ident");
  const annotation = opt(seq("@", ident));
  const fnDecl = seq(annotation, "fn", ident, "(", ")");

  // parsing and extracting result
  const result = fnDecl.parse({ stream });

  expect(result).not.toBe(null);
  assertThat(result !== null);
  const fnName = result.value[2];
  expect(fnName).toBe("foo");
});

test("parse fn foo() with seqObj", () => {
  const src = "@export fn foo()";

  const tokens = new RegexMatchers({
    ident: /[a-z]+/,
    ws: /\s+/,
    symbol: matchOneOf("( ) [ ] { } @ ; ,"),
  });
  const stream = new FilterStream(
    new MatchersStream(src, tokens),
    t => t.kind !== "ws",
  );

  // parsers
  const ident = kind("ident");
  const annotation = repeat(preceded("@", ident));
  const fnDecl = seqObj({
    annotation,
    _1: "fn",
    fnName: ident,
    _2: "(",
    _3: ")",
  });

  // parsing and extracting result
  const result = fnDecl.parse({ stream });

  expect(result).toBeDefined();
  if (result) {
    const fnName = result.value.fnName;
    expect(fnName).toBe("foo");
    const annotations: string[] = result.value.annotation;
    expect(annotations).to.toEqual(["export"]);
  }
});
