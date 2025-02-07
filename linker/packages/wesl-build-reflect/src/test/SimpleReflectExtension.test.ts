/// <reference types="vite/client" />
/// <reference types="wesl-plugin" />
import { expect, test } from "vitest";

import { structs } from "../../shaders/app.wgsl?simple_reflect";

test("simple_reflect a struct", async () => {
  // --- load reflected binding structs ---

  expect(structs).toMatchInlineSnapshot(`
    [
      {
        "MyStruct": {
          "members": {
            "firstMember": {
              "type": "u32",
            },
          },
        },
      },
    ]
  `);
});
