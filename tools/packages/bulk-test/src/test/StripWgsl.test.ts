import { expect, test } from "vitest";
import { stripWesl } from "../stripWgsl.ts";

test("strip trailing commas", () => {
  const withComma = `
    struct A { a: f32, }
  `;
  const noComma = `
    struct A {
      a: f32
    }
  `;

  expect(stripWesl(withComma)).toMatchInlineSnapshot(`"struct A { a : f32 }"`);
  expect(stripWesl(noComma)).toMatchInlineSnapshot(`"struct A { a : f32 }"`);
  expect(stripWesl(noComma)).equals(stripWesl(withComma));
});
