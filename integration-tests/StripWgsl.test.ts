import { expect } from "@std/expect";
import { stripWesl } from "./stripWgsl.ts";

Deno.test("strip trailing commas", () => {
  const withComma = `
    struct A { a: f32, }
  `;
  const noComma = `
    struct A {
      a: f32
    }
  `;
  expect(stripWesl(withComma)).toBe(`struct A { a : f32 }`);
  expect(stripWesl(noComma)).toBe(`struct A { a : f32 }`);
  expect(stripWesl(noComma)).toBe(stripWesl(withComma));
});
