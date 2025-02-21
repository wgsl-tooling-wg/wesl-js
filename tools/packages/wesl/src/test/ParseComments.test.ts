import { expectNoLog } from "mini-parse/test-util";

import { expect, test } from "vitest";
import { astToString } from "../debug/ASTtoString.js";
import { parseWESL } from "../ParseWESL.js";

test("parse fn with line comment", () => {
  const src = `
    fn binaryOp() { // binOpImpl
    }`;
  const parsed = parseWESL(src);
  expect(astToString(parsed)).toMatchInlineSnapshot(`
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
