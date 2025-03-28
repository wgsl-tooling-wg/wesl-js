import { expect } from "@std/expect";
import { overlapTail, scan } from "../Util.ts";

Deno.test("scan", () => {
  const result = scan([1, 2, 1], (a, b: string) => b.slice(a), "foobar");
  expect(result).toEqual(["foobar", "oobar", "bar", "ar"]);
});

Deno.test("overlap 0", () => {
  const result = overlapTail([2, 3], [4, 5]);
  expect(result).toBeUndefined();
});

Deno.test("overlap 1", () => {
  const result = overlapTail([2, 3], [3, 4, 5]);
  expect(result).toEqual([4, 5]);
});

Deno.test("overlap 2", () => {
  const result = overlapTail([2, 3], [2, 3]);
  expect(result).toEqual([]);
});
