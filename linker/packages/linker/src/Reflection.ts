import { matchOneOf } from "mini-parse";
import {
  BindingStructElem,
  ExpressionElem,
  StructElem,
  StructMemberElem,
  TextElem,
  TypeRefElem,
} from "./AbstractElems.ts";
import { TransformedAST } from "./Linker.ts";
import { RefIdent } from "./Scope.ts";
import {
  multisampledTextureTypes,
  sampledTextureTypes,
} from "./StandardTypes.ts";

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
Construct something that looks roughly like this 

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
  const entries = struct.members.map(memberToLayoutEntry).join(",");

  const src = `
export function ${structName}Layout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    entries: [ ${entries}
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

  const visibility = "GPUShaderStage.COMPUTE"; // TODO make dynamic

  const src = `
      {
        binding: ${binding},
        visibility: ${visibility},
        ${layoutEntry(member)}
      }`;
  return src;
}

function layoutEntry(member: StructMemberElem): string {
  const { typeRef } = member;
  let entry: string | undefined;
  const { name: typeName } = typeRef;
  if (typeName === "ptr") {
    entry = ptrLayoutEntry(typeRef);
  } else if (typeof typeName !== "string" && typeName.std) {
    entry =
      samplerLayoutEntry(typeRef) ??
      textureLayoutEntry(typeRef) ??
      storageTextureLayoutEntry(typeRef) ??
      externalTextureLayoutEntry(typeRef);
  }
  if (!entry) {
    console.error(`unhandled type: ${typeName}`);
    entry = `{ }`;
  }
  return entry;
}

function samplerLayoutEntry(typeRef: TypeRefElem): string | undefined {
  const { originalName } = typeRef.name as RefIdent;
  if (originalName === "sampler") {
    // TODO how do we set: type GPUSamplerBindingType = | "filtering" | "non-filtering";
    // (just assuming filtering as a placeholder for now)
    return `sampler: { type: "filtering" }`;
  }
  if (originalName === "sampler_comparison") {
    return `sampler: { type: "comparison" }`;
  }
}

const textureTypes = matchOneOf(sampledTextureTypes);
const multiNames = matchOneOf(multisampledTextureTypes);
function textureLayoutEntry(typeRef: TypeRefElem): string | undefined {
  const { originalName } = typeRef.name as RefIdent;
  const multisampled =
    multiNames.test(originalName) ? ", multisampled: true, " : "";
  if (multisampled || textureTypes.test(originalName)) {
    // TODO viewDimension
    const sampleType = getSampleType(typeRef);
    return `texture: { sampleType: "${sampleType}"${multisampled} }`;
  }

  function getSampleType(typeRef: TypeRefElem): string {
    const firstParam = typeRef.templateParams?.[0] as TypeRefElem;
    const firstParamName = (firstParam.name as RefIdent).originalName;
    return textureSampleType(firstParamName as GPUTextureFormat);
  }
}

function storageTextureLayoutEntry(typeRef: TypeRefElem): string | undefined {
  return undefined; // TODO
}

function externalTextureLayoutEntry(typeRef: TypeRefElem): string | undefined {
  return undefined; // TODO
}

function ptrLayoutEntry(typeRef: TypeRefElem): string | undefined {
  const param1 = typeRef.templateParams?.[0];
  const param3 = typeRef.templateParams?.[2];
  if (param1 === "uniform") {
    return `buffer: { type: "uniform" }`;
  } else if (param1 === "storage") {
    if (param3 === "read_write") {
      return `buffer: { type: "read-only-storage" }`;
    } else {
      return `buffer: { type: "storage" }`;
    }
    // TODO what do we do with the element type (2nd parameter)
    // TODO should there be an ability to set hasDynamicOffset?
  }
}

function paramText(expression: ExpressionElem): string {
  const text = expression.contents[0] as TextElem;
  return text.srcModule.src.slice(expression.start, expression.end);
}

export function textureSampleType(
  format: GPUTextureFormat,
  float32Filterable = false,
): GPUTextureSampleType {
  if (format.includes("32float")) {
    return float32Filterable ? "float" : "unfilterable-float";
  }
  if (format.includes("float") || format.includes("unorm")) {
    return "float";
  }
  if (format.includes("uint")) {
    return "uint";
  }
  if (format.includes("sint")) {
    return "sint";
  }
  throw new Error(
    `native sample type unknwon for for texture format ${format}`,
  );
}
