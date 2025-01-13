import { SrcMapBuilder } from "mini-parse";
import { expect, test } from "vitest";
import { bindIdents } from "../BindIdents.ts";
import { lowerAndEmit } from "../LowerAndEmit.ts";
import { parsedRegistry } from "../ParsedRegistry.ts";
import {
  bindingStructTransform,
  findRefsToBindingStructs,
  lowerBindingStructs,
  markBindingStructs,
  transformBindingReference,
  transformBindingStruct,
} from "../TransformBindingStructs.ts";
import { linkTestOpts, parseTest } from "./TestUtil.ts";
import { astToString, elemToString } from "../debug/ASTtoString.ts";
import { matchTrimmed } from "./shared/StringUtil.ts";
import { LinkConfig } from "../Linker.ts";

test("markBindingStructs true", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
  `;

  const ast = parseTest(src);
  const structs = markBindingStructs(ast.moduleElem);
  expect(structs.length).toBe(1);
  expect(structs[0].bindingStruct).toBe(true);
});

test("markBindingStructs false", () => {
  const src = `
    struct Bindings {
      particles: ptr<storage, array<f32>, read_write>, 
    }
  `;

  const ast = parseTest(src);
  const structs = markBindingStructs(ast.moduleElem);
  expect(structs.length).toBe(0);
});

test("transformBindingStruct", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
  `;

  const ast = parseTest(src);
  bindIdents(ast, parsedRegistry(), {});
  const bindingStruct = markBindingStructs(ast.moduleElem)[0];
  const newVars = transformBindingStruct(bindingStruct, new Set());

  const srcBuilder = new SrcMapBuilder();
  lowerAndEmit(srcBuilder, newVars, {});
  const linked = srcBuilder.build().dest;
  expect(linked).toMatchInlineSnapshot(
    `"var @group(0) @binding(0) particles<storage, read_write> : array<f32>;"`,
  );
});

test("findRefsToBindingStructs", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    struct NotBindings { a: i32 }
    var y: NotBindings;

    fn main(b: Bindings) {
      let x = b.particles;
      let z = y.a;
    }
  `;

  const ast = parseTest(src);
  bindIdents(ast, parsedRegistry(), {});
  markBindingStructs(ast.moduleElem)[0];
  const found = findRefsToBindingStructs(ast.moduleElem);
  expect(found.length).toBe(1);
  const foundAst = astToString(found[0].memberRef);
  expect(foundAst).toMatchInlineSnapshot(`
    "memberRef b.particles
      ref b
      text '.'
      name particles"
  `);
});

test("transformBindingReference", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    fn main(b: Bindings) {
      let x = b.particles;
    }
  `;

  const ast = parseTest(src);
  bindIdents(ast, parsedRegistry(), {});
  const bindingStruct = markBindingStructs(ast.moduleElem)[0];
  transformBindingStruct(bindingStruct, new Set());
  const found = findRefsToBindingStructs(ast.moduleElem);
  expect(found.length).toBe(1);
  const { memberRef, struct } = found[0];
  const synthElem = transformBindingReference(memberRef, struct);
  const synthAst = elemToString(synthElem);
  expect(synthAst).toMatchInlineSnapshot(`"synthetic 'particles'"`);
});

test("lower binding structs", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    fn main(b: Bindings) {
      let x = b.particles;
    }
  `;

  const expected = `
var @group(0) @binding(0) particles<storage, read_write> : array<f32>;
       
    fn main() {
      let x = particles;
    }
  `;
  const ast = parseTest(src);
  const bindResult = bindIdents(ast, parsedRegistry(), {});
  const lowered = lowerBindingStructs(ast, bindResult.globalNames);
  const loweredAst = astToString(lowered);
  expect(loweredAst).toMatchInlineSnapshot(`
    "module
      synthetic 'var @group(0) @binding(0) particles<storage, read_write> : array<f32>;'
      text '
        '
      text '
        '
      fn main(b: Bindings)
        text 'fn '
        decl %main
        text '('
        param
        text ') {
          let '
        decl %x
        text ' = '
        memberRef b.particles
          synthetic 'particles'
        text ';
        }'
      text '
      '"
  `);

  const srcBuilder = new SrcMapBuilder();
  lowerAndEmit(srcBuilder, [lowered], {}, false);
  const linked = srcBuilder.build().dest;
  matchTrimmed(linked, expected);
});

test("lower binding structs with conflicting root name", () => {
  const src = `
    struct Bindings {
      @group(0) @binding(0) particles: ptr<storage, array<f32>, read_write>, 
    }
    const particles = 7;
    fn main(b: Bindings) {
      let x = b.particles;
    }
  `;

  const expected = `
var @group(0) @binding(0) particles0<storage, read_write> : array<f32>;
       
    const particles = 7;
    fn main() {
      let x = particles0;
    }
  `;
  const linkConfig: LinkConfig = {
    transforms: [bindingStructTransform],
  };

  const linked = linkTestOpts({ linkConfig }, src);
  matchTrimmed(linked, expected);
});
