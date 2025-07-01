import { expect, test } from "vitest";

// --- load reflected structs ---
import { structs } from "../../shaders/app.wgsl?simple_reflect";

test("simple_reflect a struct", async () => {
  // LATER this is not a good test due to fix build ordering issues:
  // OtherStruct is defined by a generated file, only after the test is run,
  // which makes clean builds fail to typecheck until the file is generated.
  //
  // verify ts -
  // type ExpectedType = { firstMember: number; secondMember: OtherStruct };
  // const m = structs[0] as MyStruct;
  // expectTypeOf(m).toEqualTypeOf<ExpectedType>();

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
