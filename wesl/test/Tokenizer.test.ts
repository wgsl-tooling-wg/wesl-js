import { expect, test } from "vitest";
import { WeslStream, type WeslToken } from "../parse/WeslStream.ts";

test("tokenize empty string", () => {
  const tokenizer = new WeslStream("");
  expect(tokenizer.nextToken()).toEqual(null);
});

test("parse fn foo() { }", () => {
  const src = "fn foo() { }";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "keyword",
      text: "fn",
      span: [0, 2],
    },
  );
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "word",
      text: "foo",
      span: [3, 6],
    },
  );
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: "(",
      span: [6, 7],
    },
  );
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: ")",
      span: [7, 8],
    },
  );
});

test("parse var<storage> lights : vec3<f32>", () => {
  const src = "var<storage> lights : vec3<f32>";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "keyword",
      text: "var",
      span: [0, 3],
    },
  );
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: "<",
      span: [3, 4],
    },
  );
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "word",
      text: "storage",
      span: [4, 11],
    },
  );
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: ">",
      span: [11, 12],
    },
  );
  expect(tokenizer.nextToken()?.text).toEqual("lights");
  expect(tokenizer.nextToken()?.text).toEqual(":");
  expect(tokenizer.nextToken()?.text).toEqual("vec3");
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: "<",
      span: [26, 27],
    },
  );
  expect(tokenizer.nextToken()?.text).toEqual("f32");
  expect(tokenizer.nextToken()?.text).toEqual(">");
});

test("parse >>", () => {
  const src = ">>";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: ">>",
      span: [0, 2],
    },
  );
});

test("parse >> as template", () => {
  const src = "array<foo >>";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "word",
      text: "array",
      span: [0, 5],
    },
  );
  expect(tokenizer.nextTemplateStartToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: "<",
      span: [5, 6],
    },
  );
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "word",
      text: "foo",
      span: [6, 9],
    },
  );
  expect(tokenizer.nextTemplateEndToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: ">",
      span: [10, 11],
    },
  );
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "symbol",
      text: ">",
      span: [11, 12],
    },
  );
  expect(tokenizer.nextToken()).toBe(null);
});

test("parse skip block comment", () => {
  const src = "/* /* // */ */vec3<f32>";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "word",
      text: "vec3",
      span: [14, 18],
    },
  );
});

test("parse skip line comment", () => {
  const src = "// vec3<f32> */ a\nvec3";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toEqual(
    <WeslToken> {
      kind: "word",
      text: "vec3",
      span: [18, 22],
    },
  );
});

test("parse skip line without newline", () => {
  const src = "// foo bar";
  const tokenizer = new WeslStream(src);
  expect(tokenizer.nextToken()).toBe(null);
  expect(tokenizer.checkpoint()).toBe(src.length);
});
