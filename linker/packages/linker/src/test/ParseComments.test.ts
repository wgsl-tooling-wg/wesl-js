import { expectNoLog } from "mini-parse/test-util";

import { expect, test } from "vitest";
import { astToString } from "../debug/ASTtoString.js";
import { parseWESL } from "../ParseWESL.js";
import { testAppParse } from "./TestUtil.js";

test.skip("lineComment parse // foo bar", () => {
  let lineComment = null as any;
  const src = "// foo bar";
  const { position } = testAppParse(lineComment, src);
  expect(position).toBe(src.length);
});

test.skip("lineComment parse // foo bar \\n", () => {
  let lineComment = null as any;
  const src = "// foo bar\n";
  const { position } = testAppParse(lineComment, src);
  expect(position).toBe(src.length);
});

test.skip("blockComment parses /* comment */", () => {
  let blockComment = null as any;
  const src = "/* comment */";
  expectNoLog(() => {
    const { parsed } = testAppParse(blockComment, src);
    expect(parsed?.value).toMatchInlineSnapshot(`
      [
        "/*",
        [
          {
            "kind": "ident",
            "text": "comment",
          },
        ],
        "*/",
      ]
    `);
  });
});

test.skip("skipBlockComment parses nested comment", () => {
  let blockComment = null as any;
  const src = "/** comment1 /* comment2 */ */";
  expectNoLog(() => testAppParse(blockComment, src));
});

test("parse fn with line comment", () => {
  const src = `
    fn binaryOp() { // binOpImpl
    }`;
  const parsed = parseWESL(src);
  expect(astToString(parsed.moduleElem)).toMatchInlineSnapshot(`
    "module
      text '
        '
      fn binaryOp()
        text 'fn '
        decl %binaryOp
        text '() { // binOpImpl
        }'"
  `);
});

test("parse empty line comment", () => {
  const src = `
  var workgroupThreads= 4;                          // 
  `;
  expectNoLog(() => parseWESL(src));
});

test("parse line comment with #replace", () => {
  const src = ` 
  const workgroupThreads= 4;                          // #replace 4=workgroupThreads
  `;
  expectNoLog(() => parseWESL(src));
});
