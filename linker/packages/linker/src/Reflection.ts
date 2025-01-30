import { matchOneOf } from "mini-parse";
import {
  BindingStructElem,
  ExpressionElem,
  StructMemberElem,
  TextElem,
  TypeRefElem,
} from "./AbstractElems.ts";
import { TransformedAST } from "./Linker.ts";
import { identElemLog } from "./LinkerUtil.ts";
import { RefIdent } from "./Scope.ts";
import {
  multisampledTextureTypes,
  sampledTextureTypes,
  textureStorageTypes,
} from "./StandardTypes.ts";

export type BindingStructReportFn = (structs: BindingStructElem[]) => void;
export const textureStorage = matchOneOf(textureStorageTypes);
/** 
 * Linker plugin that generates TypeScript strings for GPUBindingGroupLayouts
 * based on the binding structs in the WESL source
 * 
 * requires the enableBindingStructs() transform to be enabled
 * 
 * @param fn a function that will be called with the binding structs
 * (Normally the caller will pass a function that uses bindingGroupLayoutTs() 
 * to generate the TypeScript)
 *
 * The generated TypeScript looks looks roughly like this 

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
export function reportBindingStructs(
  fn: BindingStructReportFn,
): (ast: TransformedAST) => TransformedAST {
  return (ast: TransformedAST) => {
    const structs = ast.notableElems.bindingStructs as BindingStructElem[];
    fn(structs);
    return ast;
  };
}

function firstLetterLower(s: string): string {
  return s[0].toLowerCase() + s.slice(1);
}

/**
 * @return a string containing a generated TypeScript function that creates
 * a GPUBindingGroupLayout instance to align with the binding structures
 * in wesl source.
 */
export function bindingGroupLayoutTs(
  struct: BindingStructElem,
  typeScript = true,
): string {
  if (!struct) {
    console.log("no struct!???");
    return "";
  }
  const structName = firstLetterLower(struct.name.ident.mangledName!);
  const visibility = shaderVisiblity(struct);
  const entries = struct.members
    .map(m => memberToLayoutEntry(m, visibility))
    .join(",");

  const fnName = `${structName}Layout`;
  const entriesName = `${structName}Entries`;

  const fnParams =
    typeScript ? `(device: GPUDevice): GPUBindGroupLayout` : `(device)`;

  const src = `
const ${entriesName} = [ ${entries} ];
function ${fnName}${fnParams} {
  return device.createBindGroupLayout({
    entries: ${entriesName} 
  });
}

export const layoutFunctions = { ${fnName} };
export const layoutEntries = { ${entriesName} };
  `;
  return src;
}

/** return the shader stage visibility for a binding struct, based on
 * the shader entry function that has the binding struct as a parameter.
 *
 * The shader entry function is attached to the binding struct
 * by the enableBindingStructs() transform.
 */
function shaderVisiblity(struct: BindingStructElem): string {
  const { entryFn } = struct;
  if (!entryFn) {
    identElemLog(struct.name, "missing entry function for binding struct");
  } else {
    const { fnAttributes = [] } = entryFn;
    if (fnAttributes.find(a => a.name === "compute")) {
      return "GPUShaderStage.COMPUTE";
    }
    if (fnAttributes.find(a => a.name === "vertex")) {
      return "GPUShaderStage.VERTEX";
    }
    if (fnAttributes.find(a => a.name === "fragment")) {
      return "GPUShaderStage.FRAGMENT";
    }
  }
  identElemLog(struct.name, "unknown entry point type for binding struct");
  return "GPUShaderStage.COMPUTE";
}

/**
 * @return a GPUBindGroupLayoutEntry corresponding to one member
 * of a WESL binding struct.
 */
function memberToLayoutEntry(
  member: StructMemberElem,
  visibility: string,
): string {
  const bindingParam = member.attributes?.find(a => a.name === "binding")
    ?.params?.[0];
  const binding = bindingParam ? paramText(bindingParam) : "?";

  const src = `
      {
        binding: ${binding},
        visibility: ${visibility},
        ${layoutEntry(member)}
      }`;
  return src;
}

/** @return the guts of the GPUBindGroupLayoutEntry for this binding struct member.
 * ptr references to storage arrays become 'buffer' GPUBufferBindingLayout intances,
 * references to WGSL samplers become 'sampler' GPUSamplerBindingLayout instances, etc.
 */
function layoutEntry(member: StructMemberElem): string {
  const { typeRef } = member;
  let entry: string | undefined;
  const { name: typeName } = typeRef;
  entry = ptrLayoutEntry(typeRef) ?? storageTextureLayoutEntry(typeRef);
  if (!entry && typeof typeName !== "string" && typeName.std) {
    entry =
      samplerLayoutEntry(typeRef) ??
      textureLayoutEntry(typeRef) ??
      externalTextureLayoutEntry(typeRef);
  }
  if (!entry) {
    console.error(`unhandled type: ${typeName}`);
    entry = `{ }`;
  }
  return entry;
}

function ptrLayoutEntry(typeRef: TypeRefElem): string | undefined {
  const { name: typeName } = typeRef;
  if (typeName === "ptr") {
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
  return undefined;

  function getSampleType(typeRef: TypeRefElem): string {
    const firstParam = typeRef.templateParams?.[0] as TypeRefElem;
    const firstParamName = (firstParam.name as RefIdent).originalName;
    return textureSampleType(firstParamName as GPUTextureFormat);
  }
}

function storageTextureLayoutEntry(typeRef: TypeRefElem): string | undefined {
  const name = typeRef.name;
  if (typeof name === "string" && textureStorage.test(name)) {
    const firstParam = typeRef.templateParams?.[0] as string;
    const secondParam = typeRef.templateParams?.[1] as string;
    const sampleType = textureSampleType(firstParam as GPUTextureFormat);
    const access = accessMode(secondParam);
    return `storageTexture: { format: "${firstParam}", sampleType: "${sampleType}", access: "${access}" }`;
  }
  return undefined;
}

function externalTextureLayoutEntry(typeRef: TypeRefElem): string | undefined {
  const { originalName } = typeRef.name as RefIdent;
  if (originalName === "texture_external") {
    // TODO. how would we set the required source: HTMLVideoElement or VideoFrame?
  }
  return undefined;
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
  throw new Error(`native sample type unknwon for texture format ${format}`);
}

export function accessMode(access: string): GPUStorageTextureAccess {
  if (access === "read") {
    return "read-only";
  }
  if (access === "write") {
    return "write-only";
  }
  if (access === "read_write") {
    return "read-write";
  }
  throw new Error(`unknown access mode: ${access}`);
}
