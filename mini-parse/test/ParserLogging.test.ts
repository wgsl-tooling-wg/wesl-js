import { expect } from "@std/expect";
import { srcLine, srcLog } from "../ParserLogging.ts";
import { logCatch } from "../test-util/LogCatcher.ts";
import { withLogger } from "../WrappedLog.ts";
import { assertSnapshot } from "@std/testing/snapshot";

Deno.test("srcLine", () => {
  const src1 = "1";
  const src2 = "line 2";
  const src3 = " line 3";
  const src = [src1, src2, src3].join("\n");

  const { line: line1 } = srcLine(src, 0);
  expect(line1).toBe(src1);

  const { line: line4 } = srcLine(src, 1);
  expect(line4).toBe(src1);

  const { line: line5 } = srcLine(src, 2);
  expect(line5).toBe(src2);

  const { line: line2 } = srcLine(src, 3);
  expect(line2).toBe(src2);

  const { line: line3 } = srcLine(src, 100);
  expect(line3).toBe(src3);
});

Deno.test("srcLog", async (t) => {
  const src = `a\n12345\nb`;

  const { log, logged } = logCatch();
  withLogger(log, () => {
    srcLog(src, 5, "uh-oh:");
  });
  await assertSnapshot(t, logged());
});

Deno.test("srcLog on longer example", async (t) => {
  const src = `
    #export(C, D) /*            */
    fn foo(c:C, d:D) { support(d); } 
    
    fn support(d:D) { bar(d); }
    `;
  const { log, logged } = logCatch();
  withLogger(log, () => {
    srcLog(src, 101, "ugh:");
  });
  await assertSnapshot(t, logged());
});

Deno.test("srcLog with two carets", async (t) => {
  const src = `a\n12345\nb`;

  const { log, logged } = logCatch();
  withLogger(log, () => {
    srcLog(src, [2, 7], "found:");
  });
  await assertSnapshot(t, logged());
});
