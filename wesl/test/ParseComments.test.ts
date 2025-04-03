import { expectNoLog } from "@wesl/mini-parse/test-util";

import { expect, test } from "vitest";
import { astToString } from "../debug/ASTtoString.ts";
import { parseWESL } from "./TestUtil.ts";

test("parse fn with line comment", () => {
  const src = `
    fn binaryOp() { // binOpImpl
    }`;
  const parsed = parseWESL(src);
  expect(astToString(parsed.moduleElem)).toMatchInlineSnapshot();
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
