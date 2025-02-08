import fs from "node:fs/promises";
import {
  PluginExtension,
  PluginExtensionApi,
} from "wesl-plugin/src/PluginExtension.js"; // TODO fix type exports from wesl-plugin
import { StructElem, TypeRefElem } from "../../linker/src/AbstractElems.js";

export interface WeslStruct {
  members: Record<string, WeslMember>;
}

export interface WeslMember {
  type: string;
}

export interface SimpleReflectOptions {
  /** directory to contain the .d.ts files or undefined to not write .d.ts files */
  typesDir?: string;
}

/** wesl-js build extension to reflect wgsl structs into js and .d.ts. files */
export function simpleReflect(
  options: SimpleReflectOptions = {},
): PluginExtension {
  const { typesDir = "./src/types" } = options;
  return {
    extensionName: "simple_reflect",
    emitFn: makeReflect({ typesDir }),
  };
}

/** Create an emit function for the plugin
 *
 * The emit funcion will return a JavaScript WeslStruct that describes the shape of a wgsl struct
 * and write a .d.ts file containing the struct types.
 */
function makeReflect(options: SimpleReflectOptions) {
  const { typesDir } = options;
  return emitReflect;

  async function emitReflect(
    baseId: string,
    api: PluginExtensionApi,
  ): Promise<string> {
    const registry = await api.weslRegistry();

    const astStructs = Object.entries(registry.modules).flatMap(([, module]) =>
      module.moduleElem.contents.filter(e => e.kind === "struct"),
    );

    const jsStructs = weslStructs(astStructs);

    if (typesDir) writeTypes(astStructs, typesDir);

    const structArray = JSON.stringify(jsStructs, null, 2);
    return `export const structs = ${structArray};`;
  }
}

type StructsRecord = Record<string, WeslStruct>;

/** @return js descriptions in WeslStruct format of structs from wesl/wgsl */
function weslStructs(astStructs: StructElem[]): StructsRecord[] {
  return astStructs.map(s => {
    const structName = s.name.ident.originalName;
    const memberEntries = s.members.map(m => {
      const weslMember: WeslMember = { type: originalTypeName(m.typeRef) };
      return [m.name.name, weslMember] as [string, WeslMember];
    });
    const members = Object.fromEntries(memberEntries);
    const weslStruct: WeslStruct = { members };
    return { [structName]: weslStruct };
  });
}

/** write d.ts file defining ts interfaces for these structs */
async function writeTypes(
  astStructs: StructElem[],
  typesDir: string,
): Promise<void> {
  const tsdInterfaces = astStructs.map(s => {
    const structName = s.name.ident.originalName;
    const memberEntries = s.members.map(m => {
      const wgslType = originalTypeName(m.typeRef);
      const tsType = wgslTypeToTs(wgslType);
      return `  ${m.name.name}: ${tsType};`;
    });
    return `interface ${structName} {\n${memberEntries.join("\n")}\n}`;
  });

  const dtsText = tsdInterfaces.join("\n");
  await fs.mkdir(typesDir, { recursive: true });
  await fs.writeFile(`${typesDir}/reflectTypes.d.ts`, dtsText);
}

function wgslTypeToTs(wgslType: string): string {
  switch (wgslType) {
    case "f32":
    case "f16":
    case "u32":
    case "i32":
      return "number";
    default:
      return wgslType;
  }
}

function originalTypeName(typeRef: TypeRefElem): string {
  const { name } = typeRef;
  if (typeof name === "string") {
    return name;
  }
  return name.originalName;
}
