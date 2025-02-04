import { expect, test } from "vitest";
import { matchingLexer } from "../MatchingLexer.js";
import {
  kind,
  opt,
  preceded,
  repeat,
  seq,
  seqObj,
} from "../ParserCombinator.js";
import { matchOneOf } from "../stream/RegexHelpers.js";
import { RegexMatchers } from "../stream/MatchersStream.js";

test("parse fn foo()", () => {
  const src = "fn foo()";

  // lexer
  const tokens = new RegexMatchers({
    ident: /[a-z]+/,
    ws: /\s+/,
    symbol: matchOneOf("( ) [ ] { } @ ; ,"),
  });
  const lexer = matchingLexer(src, tokens);

  // parsers
  const ident = kind("ident");
  const fnDecl = seq("fn", ident, "(", ")");

  // parsing and extracint result
  const result = fnDecl.parse({ lexer });

  if (result) {
    const foundIdent = result.value[1];
    expect(foundIdent).toBe("foo");
  }
  expect(result).toBeDefined();
});

test("parse fn foo() with annotation in grammar", () => {
  const src = "fn foo()";

  // lexer
  const tokens = new RegexMatchers({
    ident: /[a-z]+/,
    ws: /\s+/,
    symbol: matchOneOf("( ) [ ] { } @ ; ,"),
  });
  const lexer = matchingLexer(src, tokens);

  // parsers
  const ident = kind("ident");
  const annotation = opt(seq("@", ident));
  const fnDecl = seq(annotation, "fn", ident, "(", ")");

  // parsing and extracting result
  const result = fnDecl.parse({ lexer });

  if (result) {
    const fnName = result.value[2];
    expect(fnName).toBe("foo");
  }
  expect(result).toBeDefined();
});

test("parse fn foo() with seqObj", () => {
  const src = "@export fn foo()";

  // lexer
  const tokens = new RegexMatchers({
    ident: /[a-z]+/,
    ws: /\s+/,
    symbol: matchOneOf("( ) [ ] { } @ ; ,"),
  });
  const lexer = matchingLexer(src, tokens);

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
  const result = fnDecl.parse({ lexer });

  expect(result).toBeDefined();
  if (result) {
    const fnName = result.value.fnName;
    expect(fnName).toBe("foo");
    const annotations: string[] = result.value.annotation;
    expect(annotations).to.toEqual(["export"]);
  }
});
