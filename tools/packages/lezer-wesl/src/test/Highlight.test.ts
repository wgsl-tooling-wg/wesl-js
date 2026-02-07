import { expect, test } from "vitest";
import { checkHighlights, type StyledSpan } from "./HighlightCheck.ts";

function expectStyled(spans: StyledSpan[], text: string, cls: string) {
  const match = spans.find(s => s.text === text);
  expect(match, `no styled span for "${text}"`).toBeDefined();
  expect(match!.classes).toBe(cls);
}

test("number literal", () => {
  const spans = checkHighlights("const x = 42u;");
  expectStyled(spans, "42u", "number");
});

test("boolean literal", () => {
  const spans = checkHighlights("const x = true;");
  expectStyled(spans, "true", "bool");
});

test("line comment", () => {
  const spans = checkHighlights("// foo\nfn f() {}");
  expectStyled(spans, "// foo", "lineComment");
});

test("block comment", () => {
  const spans = checkHighlights("/* bar */\nfn f() {}");
  expectStyled(spans, "/* bar */", "blockComment");
});

test("control keyword fn", () => {
  const spans = checkHighlights("fn f() {}");
  expectStyled(spans, "fn", "controlKeyword");
});

test("definition keyword var", () => {
  const spans = checkHighlights("var<private> x: f32;");
  expectStyled(spans, "var", "defKeyword");
});

test("import keyword", () => {
  const spans = checkHighlights("import foo::bar;");
  expectStyled(spans, "import", "keyword");
});

test("function name definition", () => {
  const spans = checkHighlights("fn myFunc() {}");
  expectStyled(spans, "myFunc", "fnDef");
});

test("struct name definition", () => {
  const spans = checkHighlights("struct MyStruct { x: f32, }");
  expectStyled(spans, "MyStruct", "typeDef");
});

test("builtin type in type position", () => {
  const spans = checkHighlights("var<private> x: f32;");
  expectStyled(spans, "f32", "keyword");
});

test("user type in type position", () => {
  const spans = checkHighlights("var x: MyStruct;");
  expectStyled(spans, "MyStruct", "typeName");
});

test("struct member property", () => {
  const spans = checkHighlights("struct S { count: u32, }");
  expectStyled(spans, "count", "property");
});

test("param definition", () => {
  const spans = checkHighlights("fn f(x: u32) {}");
  expectStyled(spans, "x", "varDef");
});

test("attribute @vertex", () => {
  const spans = checkHighlights("@vertex\nfn f() {}");
  expectStyled(spans, "vertex", "keyword");
});

test("attribute @binding with args", () => {
  const spans = checkHighlights("@binding(0) var<uniform> u: f32;");
  expectStyled(spans, "binding", "keyword");
});

test("assign operator", () => {
  const spans = checkHighlights("fn f() { var x = 0u; x += 1u; }");
  expectStyled(spans, "+=", "assignOp");
});

test("update operator", () => {
  const spans = checkHighlights("fn f() { var x = 0u; x++; }");
  expectStyled(spans, "++", "updateOp");
});

test("parentheses", () => {
  const spans = checkHighlights("fn f() {}");
  expectStyled(spans, "(", "paren");
  expectStyled(spans, ")", "paren");
});

test("square brackets", () => {
  const spans = checkHighlights(
    "fn f() { var a = array<u32, 2>(); let x = a[0]; }",
  );
  expectStyled(spans, "[", "bracket");
  expectStyled(spans, "]", "bracket");
});

test("braces", () => {
  const spans = checkHighlights("fn f() {}");
  expectStyled(spans, "{", "brace");
  expectStyled(spans, "}", "brace");
});

test("angle brackets", () => {
  const spans = checkHighlights("var<private> x: vec3<f32>;");
  const angles = spans.filter(s => s.text === "<" || s.text === ">");
  expect(angles.length).toBeGreaterThanOrEqual(2);
});

test("import path: package is keyword, rest is namespace", () => {
  const spans = checkHighlights("import package::utils::helper;");
  expectStyled(spans, "package", "keyword");
  expectStyled(spans, "utils", "namespace");
  expectStyled(spans, "helper", "namespace");
});

test("import path: super is keyword", () => {
  const spans = checkHighlights("import super::utils;");
  expectStyled(spans, "super", "keyword");
  expectStyled(spans, "utils", "namespace");
});

test("import collection items are namespace", () => {
  const spans = checkHighlights("import package::utils::{foo, bar};");
  expectStyled(spans, "foo", "namespace");
  expectStyled(spans, "bar", "namespace");
});

test("property access same color as variable", () => {
  const spans = checkHighlights("fn f() { var v = s.xy; }");
  expectStyled(spans, "xy", "variableName");
});

test("path expression: base is namespace, access is fn", () => {
  const spans = checkHighlights("fn f() { let v = utils::gradient(uv); }");
  expectStyled(spans, "utils", "namespace");
  expectStyled(spans, "gradient", "fnCall");
});

test("type path: base is namespace, last is typeName", () => {
  const spans = checkHighlights("var x: test::Uniforms;");
  expectStyled(spans, "test", "namespace");
  expectStyled(spans, "Uniforms", "typeName");
});

test("multi-segment path: intermediates are namespace", () => {
  const spans = checkHighlights("fn f() { let v = pkg::utils::gradient(uv); }");
  expectStyled(spans, "pkg", "namespace");
  expectStyled(spans, "utils", "namespace");
  expectStyled(spans, "gradient", "fnCall");
});

test("builtin function is keyword", () => {
  const spans = checkHighlights("fn f() { let v = sin(1.0); }");
  expectStyled(spans, "sin", "keyword");
});

test("builtin fn as param name is varDef, not keyword", () => {
  const spans = checkHighlights("fn f(min: f32) {}");
  expectStyled(spans, "min", "varDef");
});

test("template call with builtin type is keyword", () => {
  const spans = checkHighlights("fn f() { let v = vec2<f32>(1.0, 2.0); }");
  expectStyled(spans, "vec2", "keyword");
});

test("builtin type constructor is keyword", () => {
  const spans = checkHighlights(
    "fn f() { let v = vec4f(1.0, 2.0, 3.0, 1.0); }",
  );
  expectStyled(spans, "vec4f", "keyword");
});
