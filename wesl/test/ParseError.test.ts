import { expect } from "@std/expect";
import { errorHighlight } from "../Util.ts";
import { parseTest } from "./TestUtil.ts";
import { assertSnapshot } from "@std/testing/snapshot";

function getError(fn: () => void) {
  try {
    fn();
  } catch (e) {
    return e;
  }
}

Deno.test("parse fn foo() { invalid }", async (t) => {
  const src = "fn foo() { let }";
  await assertSnapshot(t, getError(() => parseTest(src)));
});

Deno.test("parse invalid if", async (t) => {
  const src = `fn foo() { 
  let a = 3;
  if(1<1) { 🐈‍⬛ } else {  }
  }`;
  await assertSnapshot(t, getError(() => parseTest(src)));
});

Deno.test("parse invalid name", async (t) => {
  const src = "var package = 3;";
  await assertSnapshot(t, getError(() => parseTest(src)));
});

Deno.test("error highlight", () => {
  expect(errorHighlight("foo", [0, 2]).join("\n")).toBe(`foo
^^`);
  expect(errorHighlight("foo", [0, 1]).join("\n")).toBe(`foo
^`);
  expect(errorHighlight("foo", [0, 0]).join("\n")).toBe(`foo
^`);
  expect(errorHighlight("foo", [1, 2]).join("\n")).toBe(`foo
 ^`);
});
