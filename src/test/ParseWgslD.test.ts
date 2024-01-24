import { expect, test } from "vitest";
import { FnElem } from "../AbstractElems.js";
import { parseWgslD } from "../ParseWgslD.js";
import { expectNoLogErr, testParse } from "./TestParse.js";

import {
  directive,
  importing,
  lineCommentOptDirective,
} from "../ParseDirective.js";
import {
  comment,
  skipBlockComment,
  unknown,
  wordNumArgs,
} from "../ParseSupport.js";
import { enableTracing } from "../ParserTracing.js";
import { or, repeat } from "../ParserCombinator.js";
import { logCatch } from "./LogCatcher.js";
import { _withErrLogger } from "../LinkerUtil.js";
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
  const { position } = testParse(lineCommentOptDirective, src);
  expect(position).eq(src.length);
});

test("lineComment parse // foo bar \\n", () => {
  const comment = "// foo bar";
  const src = comment + "\n x";
  const { position } = testParse(lineCommentOptDirective, src);
  expect(position).eq(comment.length);
});

test("lineComment parse // #export foo", () => {
  const src = "// #export foo";
  const { position, app } = testParse(lineCommentOptDirective, src);
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

test("lineCommentOptDirective parses #export(foo) with trailing space", () => {
  const src = `// #export (Elem)    `;
  const result = testParse(lineCommentOptDirective, src);
  expect(result.app[0].kind).eq("export");
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
  expect(parsed[0]).toMatchSnapshot();
});

test("parse @attribute before fn", () => {
  const src = `
    @compute 
    fn main() {}
    `;
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("wordNumArgs parses (a, b, 1)", () => {
  const src = `(a, b, 1)`;
  const { parsed } = testParse(wordNumArgs, src);
  expect(parsed?.value).toMatchSnapshot();
});

test("wordNumArgs parses (a, b, 1) with line comments everywhere", () => {
  const src = `(
    // aah
    a, 
    // boh
    b, 
    // oneness
    1
    // satsified
    )`;
  const { parsed } = testParse(wordNumArgs.preParse(comment), src);
  expect(parsed?.value).toMatchSnapshot();
});

test("parse @compute @workgroup_size(a, b, 1) before fn", () => {
  const src = `
    @compute 
    @workgroup_size(a, b, 1) 
    fn main() {}
    `;
  const parsed = parseWgslD(src);
  expect(parsed).toMatchSnapshot();
});

test("parse and ignore global diagnostic", () => {
  const src = `
    diagnostic(off,derivative_uniformity);

    fn main() {}
    `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse and ignore const_assert", () => {
  const src = `
    const_assert x < y;

    fn main() {}
    `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse top level var", () => {
  const src = `
    @group(0) @binding(0) var<uniform> u: Uniforms;      

    fn main() {}
  `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse top level override and const", () => {
  const src = `
    override x = 21;
    const y = 1;

    fn main() {}
  `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse root level ;;", () => {
  const src = ";;";
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("parse alias", () => {
  const src = `
    alias RTArr = array<vec4<f32>>;
  `;
  expectNoLogErr(() => {
    const parsed = parseWgslD(src);
    expect(parsed).toMatchSnapshot();
  });
});

test("skipBlockComment parses /* comment */", () => {
  const src = "/* comment */";
  expectNoLogErr(() => {
    const { parsed } = testParse(skipBlockComment, src);
    expect(parsed).toMatchSnapshot();
  });
});

test("skipBlockComment parses nested comment", () => {
  const src = "/** comment1 /* comment2 */ */";
  expectNoLogErr(() => {
    testParse(skipBlockComment, src);
  });
});

test("unexpected token", () => {
  const p = repeat(or("a", unknown));
  const { log, logged } = logCatch();
  _withErrLogger(log, () => testParse(p, "a b"));
  expect(logged()).toMatchInlineSnapshot(`
    "??? [object Object]
    a b
      ^"
  `);
});
