import {
  BindingStructElem,
  ExpressionElem,
  StructElem,
  StructMemberElem,
  TextElem,
} from "./AbstractElems.ts";
import { astToString } from "./debug/ASTtoString.ts";
import { TransformedAST } from "./Linker.ts";

export type BindingStructReportFn = (structs: StructElem[]) => void;

export function reportBindingStructs(
  fn: BindingStructReportFn,
): (ast: TransformedAST) => TransformedAST {
  return (ast: TransformedAST) => {
    const structs = ast.notableElems.bindingStructs as StructElem[];
    fn(structs);
    return ast;
  };
}
/*
Construct something that looks like this 

  export function MyBindingLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage",
          },
        },
      ],
    });
  }

*/

/**
 * @return a function that calls createBindGroupLayout()
 * to create the binding group layout defined by a given binding struct
 */
export function bindingGroupLayoutTs(struct: BindingStructElem): string {
  const structName = struct.name.ident.mangledName;
  const entries = struct.members.map(memberToLayoutEntry).join(",\n");

  const src = `
export function ${structName}Layout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    entries: [
      ${entries}
    ]
  });
}
  `;
  return src;
}

/*
 *
 */
function memberToLayoutEntry(member: StructMemberElem): string {
  const bindingParam = member.attributes?.find(a => a.name === "binding")
    ?.params?.[0];
  const binding = bindingParam ? paramText(bindingParam) : "?";
  const { typeRef } = member;

  const visibility = "GPUShaderStage.COMPUTE"; // TODO make dynamic
  let layoutEntry = "tbd";
  const { name: typeName } = typeRef;
  if (typeName === "ptr") {
    const param1 = typeRef.templateParams?.[0];
    const param3 = typeRef.templateParams?.[2];
    if (param1 === "storage") {
      layoutEntry = "buffer";
      if (param3 === "read_write") {
        layoutEntry = `buffer: { type: "read-only-storage" }`;
      } else {
        layoutEntry = `buffer: { type: "storage" }`;
      }
    } else if (param1 === "uniform") {
      layoutEntry = `{ buffer: { type: "uniform" } }`;
    }
  } else if (typeof typeName !== "string" && typeName.std) {
    const { originalName } = typeName;
    if (originalName === "sampler") {
      // TODO how to set: type GPUSamplerBindingType = | "filtering" | "non-filtering" | "comparison";
      layoutEntry = `{ sampler: { } }`;
    } else if (originalName === "texture_2d") {
      layoutEntry = `{ texture: { } }`;
    }
  }

  /*
  texture?: GPUTextureBindingLayout;
  storageTexture?: GPUStorageTextureBindingLayout;
  externalTexture?: GPUExternalTextureBindingLayout;
  */

  const src = `{
        binding: ${binding},
        visibility: ${visibility},
        ${layoutEntry}
      }`;
  return src;
}

function paramText(expression: ExpressionElem): string {
  const text = expression.contents[0] as TextElem;
  return text.srcModule.src.slice(expression.start, expression.end);
}
