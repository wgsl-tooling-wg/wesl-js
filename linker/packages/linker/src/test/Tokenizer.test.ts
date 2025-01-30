import { expect, test } from "vitest";
import { WeslStream, WeslToken } from "../parse/WeslStream";

test("tokenize empty string", () => {
  const tokenizer = new WeslStream("");
  expect(tokenizer.nextToken()).toEqual(null);
});

test("parse fn foo() { }", () => {
  const src = "fn foo() { }";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "keyword",
    value: "fn",
    span: [0, 2],
  });
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "word",
    value: "foo",
    span: [3, 6],
  });
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "symbol",
    value: "(",
    span: [6, 7],
  });
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "symbol",
    value: ")",
    span: [7, 8],
  });
});

test("parse var<storage> lights : vec3<f32>", () => {
  const src = "var<storage> lights : vec3<f32>";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "keyword",
    value: "var",
    span: [0, 3],
  });
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "symbol",
    value: "<",
    span: [3, 4],
  });
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "word",
    value: "storage",
    span: [4, 11],
  });
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "symbol",
    value: ">",
    span: [11, 12],
  });
  expect(tokenizer.nextToken()?.value).toEqual("lights");
  expect(tokenizer.nextToken()?.value).toEqual(":");
  expect(tokenizer.nextToken()?.value).toEqual("vec3");
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "symbol",
    value: "<",
    span: [26, 27],
  });
  expect(tokenizer.nextToken()?.value).toEqual("f32");
  expect(tokenizer.nextToken()?.value).toEqual(">");
});

test("parse >>", () => {
  const src = ">>";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "symbol",
    value: ">>",
    span: [0, 2],
  });
});

test("parse >> as template", () => {
  const src = "foo >>";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "word",
    value: "foo",
    span: [0, 3],
  });
  expect(tokenizer.nextTemplateToken()).toEqual(<WeslToken>{
    kind: "symbol",
    value: ">",
    span: [4, 5],
  });
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "symbol",
    value: ">",
    span: [5, 6],
  });
});

test("parse skip block comment", () => {
  const src = "/* /* // */ */vec3<f32>";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "word",
    value: "vec3",
    span: [14, 18],
  });
});

test("parse skip line comment", () => {
  const src = "// vec3<f32> */ a\nvec3";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(<WeslToken>{
    kind: "word",
    value: "vec3",
    span: [18, 22],
  });
});
