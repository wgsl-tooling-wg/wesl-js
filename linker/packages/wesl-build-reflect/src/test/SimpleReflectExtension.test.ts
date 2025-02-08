/// <reference types="vite/client" />
/// <reference types="wesl-plugin" />
import { expect, expectTypeOf, test } from "vitest";

// --- load reflected structs ---
import { structs } from "../../shaders/app.wgsl?simple_reflect";

test("simple_reflect a struct", async () => {
  // verify ts
  type ExpectedType = { firstMember: number; secondMember: OtherStruct };
  const m = structs[0] as MyStruct;
  expectTypeOf(m).toEqualTypeOf<ExpectedType>();

  // verify js
  expect(structs).toMatchInlineSnapshot(`
    [
      {
        "MyStruct": {
          "members": {
            "firstMember": {
              "type": "u32",
            },
            "secondMember": {
              "type": "OtherStruct",
            },
          },
        },
      },
      {
        "OtherStruct": {
          "members": {
            "thirdMember": {
              "type": "f32",
            },
          },
        },
      },
    ]
  `);
});
