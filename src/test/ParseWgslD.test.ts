import { expect, test } from "vitest";
import { FnElem } from "../AbstractElems.js";
import {
  directive,
  importing,
  lineComment,
  parseWgslD,
} from "../ParseWgslD.js";
import { testParse } from "./TestParse.js";

import { enableTracing } from "../ParserTracing.js";
import { dlog } from "berry-pretty";
enableTracing();

test("parse empty string", () => {
  const parsed = parseWgslD("");
  expect(parsed).toMatchSnapshot();
});

test("directive parses #export", () => {
  const parsed = testParse(directive, "#export");
  expect(parsed.app[0].kind).equals("export");
});

test("parse #export", () => {
  const parsed = parseWgslD("#export");
  expect(parsed[0].kind).equals("export");
});

test("parse #export foo", () => {
  const parsed = parseWgslD("#export foo");
  expect(parsed).toMatchSnapshot();
});

test("parse #export foo(bar)", () => {
  const parsed = parseWgslD("#export foo(bar)");
  expect(parsed).toMatchSnapshot();
});

test("parse #export foo(bar, baz, boo)", () => {
  const parsed = parseWgslD("#export foo(bar, baz, boo)");
  expect(parsed).toMatchSnapshot();
});

test("parse #import foo", () => {
  const parsed = parseWgslD("#import foo");
  expect(parsed).toMatchSnapshot();
});

test("parse #import foo(a,b) as baz from bar", () => {
  const parsed = parseWgslD("#import foo as baz from bar");
  expect(parsed).toMatchSnapshot();
});

test("lineComment parse // foo bar", () => {
  const src = "// foo bar";
  const { position } = testParse(lineComment, src);
  expect(position).eq(src.length);
});

test("lineComment parse // foo bar \\n", () => {
  const comment = "// foo bar";
  const src = comment + "\n x";
  const { position } = testParse(lineComment, src);
  expect(position).eq(comment.length);
});

test("lineComment parse // #export foo", () => {
  const src = "// #export foo";
  const { position, app } = testParse(lineComment, src);
  expect(position).eq(src.length);
  expect(app).toMatchSnapshot();
});

test("parse fn foo() { }", () => {
  const src = "fn foo() { }";
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse fn with calls", () => {
  const src = "fn foo() { foo(); bar(); }";
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse struct", () => {
  const src = "struct Foo { a: f32; b: i32; }";
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse fn with line comment", () => {
  const src = `
    fn binaryOp() { // binOpImpl
    }`;
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse #export(foo) with trailing space", () => {
  const src = `
    // #export (Elem) 
    `;
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse #if #endif", () => {
  const src = `
    #if foo
    fn f() { }
    #endif
    `;
  const parsed = parseWgslD(src, { foo: true });
  expect(parsed.length).eq(1);
  expect((parsed[0] as FnElem).name).eq("f");
});

test("parse #if !foo #else #endif", () => {
  const src = `
    // #if !foo
      fn f() { notfoo(); }
    // #else
      fn g() { foo(); }
    // #endif 
    `;
  const parsed = parseWgslD(src, { foo: true });
  expect(parsed.length).eq(1);
  expect((parsed[0] as FnElem).name).eq("g");
});

test("importing parses importing bar(A) fog(B)", () => {
  const src = `
    importing bar(A), fog(B)
  `;
  const { parsed } = testParse(importing, src);
  expect(parsed?.named.importing).toMatchSnapshot();
});

test("parse #export(A, B) importing bar(A)", () => {
  const src = `
    #export(A, B) importing bar(A)
    fn foo(a:A, b:B) { bar(a); }
  `;
  const parsed = parseWgslD(src, { foo: true });
  console.log(parsed);
  expect(parsed[0]).toMatchSnapshot();
});

// TODO
test("parse top level var", () => {
  const src = `
    var <workgroup> myWork:array<Output, workgroupThreads>; 
  `
  const parsed = parseWgslD(src);
  console.log(parsed);
});