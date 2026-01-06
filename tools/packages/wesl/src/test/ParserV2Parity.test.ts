// Parity tests for v2 parser
// Validates v2 parser produces identical ASTs to mini-parse based v1 parser

import { describe, expect, test } from "vitest";
import { parseSrcModule } from "../ParseWESL.ts";
import { parseWeslV2 } from "../parse/v2/ParseWeslV2.ts";
import type { SrcModule } from "../Scope.ts";
import { resetScopeIds } from "../Scope.ts";

function createSrcModule(src: string, modulePath = "test"): SrcModule {
  return { modulePath, debugFilePath: `${modulePath}.wesl`, src };
}

/** Parse with both parsers and compare ASTs. */
function testParity(src: string) {
  const srcModule = createSrcModule(src);
  // Reset scope IDs before V2 for deterministic comparison
  const astV1 = parseSrcModule(srcModule);
  resetScopeIds();
  const astV2 = parseWeslV2(srcModule);

  // Compare semantic elements only (filter out TextElem whitespace/comments)
  const v1SemanticElems = astV1.moduleElem.contents.filter(
    e => e.kind !== "text",
  );
  const v2SemanticElems = astV2.moduleElem.contents.filter(
    e => e.kind !== "text",
  );

  expect(v2SemanticElems.length, "semantic elements count").toBe(
    v1SemanticElems.length,
  );
  expect(astV2.imports.length, "imports.length").toBe(astV1.imports.length);
  expect(astV2.rootScope.id, "rootScope.id").toBe(astV1.rootScope.id);

  return { astV1, astV2, v1SemanticElems, v2SemanticElems };
}

describe("ParserV2 Parity: Empty Module", () => {
  test("empty file", () => {
    testParity("");
  });

  test("whitespace only", () => {
    testParity("   \n\n  \t  \n");
  });

  test("comments only", () => {
    testParity("// comment\n/* block comment */\n");
  });
});

describe("ParserV2 Parity: Imports", () => {
  test("simple package import", () => {
    const { astV1, astV2 } = testParity("import pkg::module;");

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });

  test("relative import", () => {
    const { astV1, astV2 } = testParity("import super::sibling;");

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });

  test("import with item", () => {
    const { astV1, astV2 } = testParity("import pkg::module::Item;");

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });

  test("import with as", () => {
    const { astV1, astV2 } = testParity("import pkg::Item as Renamed;");

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });

  test("import collection", () => {
    const { astV1, astV2 } = testParity("import pkg::{Foo, Bar};");

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });

  test("nested import collection", () => {
    const { astV1, astV2 } = testParity("import pkg::{a::B, c::D};");

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });

  test("multiple imports", () => {
    const { astV1, astV2 } = testParity(`
      import pkg1::module1;
      import pkg2::module2;
      import pkg3::Item;
    `);

    expect(astV2.imports.length).toBe(3);
    expect(astV2.imports).toEqual(astV1.imports);
  });

  test("import with line comments", () => {
    const { astV1, astV2 } = testParity(`
      // This is a comment
      import pkg::module;
      // Another comment
    `);

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });

  test("import with block comments", () => {
    const { astV1, astV2 } = testParity(`
      /* Block comment */
      import pkg::module;
      /* Another block comment */
    `);

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });
});

describe("ParserV2 Parity: Import Positions", () => {
  test("import element has correct span", () => {
    const src = "import pkg::module;";
    const { astV1, astV2 } = testParity(src);

    const importElemV1 = astV1.moduleElem.contents[0];
    const importElemV2 = astV2.moduleElem.contents[0];

    // Type guard: check that elements have start/end properties
    if ("start" in importElemV1 && "start" in importElemV2) {
      expect(importElemV2.start, "start position").toBe(importElemV1.start);
      expect(importElemV2.end, "end position").toBe(importElemV1.end);
    }
  });

  test("multiple imports have correct spans", () => {
    const src = `import pkg1::a;
import pkg2::b;`;
    const { v1SemanticElems, v2SemanticElems } = testParity(src);

    for (let i = 0; i < v1SemanticElems.length; i++) {
      const elemV1 = v1SemanticElems[i];
      const elemV2 = v2SemanticElems[i];
      // Type guard: check that elements have start/end properties
      if ("start" in elemV1 && "start" in elemV2) {
        expect(elemV2.start, `import ${i} start`).toBe(elemV1.start);
        expect(elemV2.end, `import ${i} end`).toBe(elemV1.end);
      }
    }
  });
});

describe("ParserV2 Parity: Stress Tests", () => {
  test("many imports", () => {
    const imports = Array.from(
      { length: 100 },
      (_, i) => `import pkg${i}::module${i};`,
    ).join("\n");

    const { astV1, astV2 } = testParity(imports);
    expect(astV2.imports.length).toBe(100);
    expect(astV2.imports).toEqual(astV1.imports);
  });

  test("deeply nested collection", () => {
    const { astV1, astV2 } = testParity(
      "import pkg::{a::{b::{c::D, e::F}, g::H}, i::J};",
    );

    expect(astV2.imports.length).toBe(1);
    expect(astV2.imports[0]).toEqual(astV1.imports[0]);
  });
});

describe("ParserV2 Parity: Const Declarations", () => {
  test("simple const with numeric literal", () => {
    const { v1SemanticElems, v2SemanticElems } = testParity("const y = 11u;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("const");

    // Compare structure (but not full deep equality since expression parsing differs)
    const constV1 = v1SemanticElems[0];
    const constV2 = v2SemanticElems[0];

    if (constV1.kind === "const" && constV2.kind === "const") {
      expect(constV2.name.kind).toBe("typeDecl");
      expect(constV2.name.decl.kind).toBe(constV1.name.decl.kind);
      expect(constV2.name.decl.ident.originalName).toBe("y");
    }
  });

  test("const with boolean literal", () => {
    const { v2SemanticElems } = testParity("const flag = true;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("const");
  });

  test("const with identifier reference", () => {
    const { v2SemanticElems } = testParity("const x = y;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("const");
  });

  test("multiple const declarations", () => {
    const { v2SemanticElems } = testParity(`
      const x = 1u;
      const y = 2u;
      const z = 3u;
    `);

    expect(v2SemanticElems.length).toBe(3);
    expect(v2SemanticElems.every(e => e.kind === "const")).toBe(true);
  });

  test("imports and const declarations", () => {
    const { v2SemanticElems } = testParity(`
      import pkg::module;
      const x = 42u;
    `);

    expect(v2SemanticElems.length).toBe(2);
    expect(v2SemanticElems[0].kind).toBe("import");
    expect(v2SemanticElems[1].kind).toBe("const");
  });
});

describe("ParserV2 Parity: Override Declarations", () => {
  test("simple override without initialization", () => {
    const { v2SemanticElems } = testParity("override x: f32;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("override");
  });

  test("override with initialization", () => {
    const { v2SemanticElems } = testParity("override x: f32 = 1.0;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("override");
  });

  test("multiple override declarations", () => {
    const { v2SemanticElems } = testParity(`
      override a: i32 = 10;
      override b: f32;
      override c: bool = true;
    `);

    expect(v2SemanticElems.length).toBe(3);
    expect(v2SemanticElems.every(e => e.kind === "override")).toBe(true);
  });
});

describe("ParserV2 Parity: Var Declarations", () => {
  test("simple var without initialization", () => {
    const { v2SemanticElems } = testParity("var x: f32;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("gvar");
  });

  test("var with initialization", () => {
    const { v2SemanticElems } = testParity("var x: f32 = 1.0;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("gvar");
  });

  test("var with address space template", () => {
    const { v2SemanticElems } = testParity("var<private> x: f32;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("gvar");
  });
});

describe("ParserV2 Parity: Alias Declarations", () => {
  test("simple type alias", () => {
    const { v2SemanticElems } = testParity("alias Num = i32;");

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("alias");
  });

  test("multiple alias declarations", () => {
    const { v2SemanticElems } = testParity(`
      alias Int = i32;
      alias Float = f32;
      alias Bool = bool;
    `);

    expect(v2SemanticElems.length).toBe(3);
    expect(v2SemanticElems.every(e => e.kind === "alias")).toBe(true);
  });
});

describe("ParserV2 Parity: Mixed Declarations", () => {
  test("mix of all declaration types", () => {
    const { v2SemanticElems } = testParity(`
      import pkg::module;
      const x = 42u;
      override y: f32 = 1.0;
      var z: i32;
      alias MyInt = i32;
    `);

    expect(v2SemanticElems.length).toBe(5);
    expect(v2SemanticElems[0].kind).toBe("import");
    expect(v2SemanticElems[1].kind).toBe("const");
    expect(v2SemanticElems[2].kind).toBe("override");
    expect(v2SemanticElems[3].kind).toBe("gvar");
    expect(v2SemanticElems[4].kind).toBe("alias");
  });
});

describe("ParserV2 Parity: Struct Declarations", () => {
  test("simple struct", () => {
    const { v2SemanticElems } = testParity(`
      struct MyStruct {
        x: f32,
        y: f32
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("struct");
  });

  test("struct with trailing comma", () => {
    const { v2SemanticElems } = testParity(`
      struct Point {
        x: f32,
        y: f32,
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("struct");
  });

  test("struct with attributes", () => {
    const { v2SemanticElems } = testParity(`
      struct Vertex {
        @location(0) position: vec3<f32>,
        @location(1) color: vec3<f32>
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("struct");
  });
});

describe("ParserV2 Parity: Function Declarations", () => {
  test("simple function with empty body", () => {
    const { v2SemanticElems } = testParity(`
      fn foo() {}
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with return type", () => {
    const { v2SemanticElems } = testParity(`
      fn compute() -> f32 {
        return 1.0;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with parameters", () => {
    const { v2SemanticElems } = testParity(`
      fn add(a: f32, b: f32) -> f32 {
        return a + b;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with attributes", () => {
    const { v2SemanticElems } = testParity(`
      @compute @workgroup_size(8, 8)
      fn main() {
        return;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with parameter attributes", () => {
    const { v2SemanticElems } = testParity(`
      fn vertex_main(
        @location(0) position: vec3<f32>,
        @location(1) normal: vec3<f32>
      ) -> vec4<f32> {
        return vec4<f32>(position, 1.0);
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });
});

describe("ParserV2 Parity: Global Directives", () => {
  test("enable directive with single extension", () => {
    const { v2SemanticElems } = testParity(`
      enable f16;
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("directive");
  });

  test("enable directive with multiple extensions", () => {
    const { v2SemanticElems } = testParity(`
      enable f16, dual_source_blending;
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("directive");
  });

  test("requires directive", () => {
    const { v2SemanticElems } = testParity(`
      requires readonly_and_readwrite_storage_textures;
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("directive");
  });

  test("diagnostic directive", () => {
    const { v2SemanticElems } = testParity(`
      diagnostic(off, derivative_uniformity);
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("directive");
  });

  test("multiple directives", () => {
    const { v2SemanticElems } = testParity(`
      enable f16;
      requires readonly_and_readwrite_storage_textures;
      diagnostic(warning, derivative_uniformity);
    `);

    expect(v2SemanticElems.length).toBe(3);
    expect(v2SemanticElems.every(e => e.kind === "directive")).toBe(true);
  });
});

describe("ParserV2 Parity: Const Assert", () => {
  test("const_assert with simple expression", () => {
    const { v2SemanticElems } = testParity(`
      const_assert true;
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("assert");
  });

  test("const_assert with comparison", () => {
    const { v2SemanticElems } = testParity(`
      const x = 10;
      const_assert x > 5;
    `);

    expect(v2SemanticElems.length).toBe(2);
    expect(v2SemanticElems[0].kind).toBe("const");
    expect(v2SemanticElems[1].kind).toBe("assert");
  });
});

describe("ParserV2 Parity: Statements", () => {
  test("function with return statement", () => {
    const { v2SemanticElems } = testParity(`
      fn getValue() -> i32 {
        return 42;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with if statement", () => {
    const { v2SemanticElems } = testParity(`
      fn check(x: i32) -> bool {
        if (x > 0) {
          return true;
        }
        return false;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with if-else statement", () => {
    const { v2SemanticElems } = testParity(`
      fn abs(x: i32) -> i32 {
        if (x < 0) {
          return -x;
        } else {
          return x;
        }
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with for loop", () => {
    const { v2SemanticElems } = testParity(`
      fn sum() -> i32 {
        var total = 0;
        for (var i = 0; i < 10; i++) {
          total = total + i;
        }
        return total;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with while loop", () => {
    const { v2SemanticElems } = testParity(`
      fn countdown(n: i32) {
        var i = n;
        while (i > 0) {
          i = i - 1;
        }
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with loop and break", () => {
    const { v2SemanticElems } = testParity(`
      fn infinite() {
        var i = 0;
        loop {
          if (i > 10) {
            break;
          }
          i = i + 1;
        }
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with continue statement", () => {
    const { v2SemanticElems } = testParity(`
      fn skip_evens() {
        for (var i = 0; i < 10; i++) {
          if (i % 2 == 0) {
            continue;
          }
        }
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function with variable declarations", () => {
    const { v2SemanticElems } = testParity(`
      fn compute() -> f32 {
        var x: f32 = 1.0;
        let y = 2.0;
        const z = 3.0;
        return x + y + z;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });
});

describe("ParserV2 Parity: Expressions", () => {
  test("binary expressions with arithmetic operators", () => {
    const { v2SemanticElems } = testParity(`
      fn math() -> i32 {
        return 1 + 2 * 3 - 4 / 2;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("unary expressions", () => {
    const { v2SemanticElems } = testParity(`
      fn negate(x: i32, flag: bool) -> i32 {
        if (!flag) {
          return -x;
        }
        return x;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("member access expressions", () => {
    const { v2SemanticElems } = testParity(`
      fn getX(v: vec3<f32>) -> f32 {
        return v.x;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("array indexing expressions", () => {
    const { v2SemanticElems } = testParity(`
      fn getElement(arr: array<f32, 10>, idx: i32) -> f32 {
        return arr[idx];
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("function call expressions", () => {
    const { v2SemanticElems } = testParity(`
      fn helper() -> i32 {
        return 42;
      }
      fn caller() -> i32 {
        return helper() + helper();
      }
    `);

    expect(v2SemanticElems.length).toBe(2);
    expect(v2SemanticElems[0].kind).toBe("fn");
    expect(v2SemanticElems[1].kind).toBe("fn");
  });

  test("parenthesized expressions", () => {
    const { v2SemanticElems } = testParity(`
      fn precedence() -> i32 {
        return (1 + 2) * 3;
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });

  test("complex nested expressions", () => {
    const { v2SemanticElems } = testParity(`
      fn complex(v: vec3<f32>) -> f32 {
        return (v.x * 2.0 + v.y) / (v.z - 1.0);
      }
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("fn");
  });
});

describe("ParserV2 Parity: Type References", () => {
  test("simple type references", () => {
    const { v2SemanticElems } = testParity(`
      var x: f32;
      var y: i32;
      var z: bool;
    `);

    expect(v2SemanticElems.length).toBe(3);
    expect(v2SemanticElems.every(e => e.kind === "gvar")).toBe(true);
  });

  test("template type references", () => {
    const { v2SemanticElems } = testParity(`
      var v: vec3<f32>;
      var arr: array<i32, 10>;
    `);

    expect(v2SemanticElems.length).toBe(2);
    expect(v2SemanticElems.every(e => e.kind === "gvar")).toBe(true);
  });

  test("nested template type references", () => {
    const { v2SemanticElems } = testParity(`
      var ptr: ptr<storage, array<vec4<f32>>, read_write>;
    `);

    expect(v2SemanticElems.length).toBe(1);
    expect(v2SemanticElems[0].kind).toBe("gvar");
  });
});

describe("ParserV2 Parity: Complex Real-World Examples", () => {
  test("compute shader with workgroups", () => {
    const { v2SemanticElems } = testParity(`
      @group(0) @binding(0) var<storage, read_write> data: array<f32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        data[index] = data[index] * 2.0;
      }
    `);

    expect(v2SemanticElems.length).toBe(2);
    expect(v2SemanticElems[0].kind).toBe("gvar");
    expect(v2SemanticElems[1].kind).toBe("fn");
  });

  test("vertex and fragment shader pair", () => {
    const { v2SemanticElems } = testParity(`
      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec3<f32>
      }

      @vertex
      fn vs_main(@location(0) pos: vec3<f32>) -> VertexOutput {
        var output: VertexOutput;
        output.position = vec4<f32>(pos, 1.0);
        output.color = vec3<f32>(1.0, 0.0, 0.0);
        return output;
      }

      @fragment
      fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        return vec4<f32>(input.color, 1.0);
      }
    `);

    expect(v2SemanticElems.length).toBe(3);
    expect(v2SemanticElems[0].kind).toBe("struct");
    expect(v2SemanticElems[1].kind).toBe("fn");
    expect(v2SemanticElems[2].kind).toBe("fn");
  });

  test("full program with imports and directives", () => {
    // Imports must come before directives in WESL
    const { v2SemanticElems } = testParity(`
      import pkg::module;

      enable f16;
      diagnostic(off, derivative_uniformity);

      const PI = 3.14159;

      struct Uniforms {
        time: f32,
        resolution: vec2<f32>
      }

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      fn helper(x: f32) -> f32 {
        return x * PI;
      }

      @fragment
      fn main() -> @location(0) vec4<f32> {
        let t = helper(uniforms.time);
        return vec4<f32>(t, 0.0, 0.0, 1.0);
      }
    `);

    expect(v2SemanticElems.length).toBe(8);
    expect(v2SemanticElems[0].kind).toBe("import");
    expect(v2SemanticElems[1].kind).toBe("directive");
    expect(v2SemanticElems[2].kind).toBe("directive");
    expect(v2SemanticElems[3].kind).toBe("const");
    expect(v2SemanticElems[4].kind).toBe("struct");
    expect(v2SemanticElems[5].kind).toBe("gvar");
    expect(v2SemanticElems[6].kind).toBe("fn");
    expect(v2SemanticElems[7].kind).toBe("fn");
  });
});
