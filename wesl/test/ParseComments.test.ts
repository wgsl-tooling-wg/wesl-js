import { expectNoLog } from "@wesl/mini-parse/test-util";

import { test } from "vitest";
import { astToString } from "../debug/ASTtoString.ts";
import { parseWESL } from "./TestUtil.ts";
import { assertSnapshot } from "@std/testing/snapshot";

test("parse fn with line comment", async (t) => {
  const src = `
    fn binaryOp() { // binOpImpl
    }`;
  const parsed = parseWESL(src);
  await assertSnapshot(t, astToString(parsed.moduleElem));
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
