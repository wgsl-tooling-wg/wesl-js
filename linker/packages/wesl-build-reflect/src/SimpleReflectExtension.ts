import {
  PluginExtension,
  PluginExtensionApi,
} from "wesl-plugin/src/PluginExtension.js"; // TODO fix type exports from wesl-plugin
import { typeRefToString } from "../../linker/src/RawEmit.js";
import { TypeRefElem } from "../../linker/src/AbstractElems.js";

export interface WeslStruct {
  members: Record<string, WeslMember>;
}

export interface WeslMember {
  type: string;
}

export const simpleReflect: PluginExtension = {
  extensionName: "simple_reflect",
  emitFn: emitReflectJs,
};

/** Emit a JavaScript WeslStruct that describes the shape of a wgsl struct */
async function emitReflectJs(
  baseId: string,
  api: PluginExtensionApi,
): Promise<string> {
  const registry = await api.weslRegistry();

  const astStructs = Object.entries(registry.modules).flatMap(([, module]) =>
    module.moduleElem.contents.filter(e => e.kind === "struct"),
  );

  const jsStructs = astStructs.map(s => {
    const structName = s.name.ident.originalName;
    const memberEntries = s.members.map(m => {
      const weslMember: WeslMember = { type: originalTypeName(m.typeRef) };
      return [m.name.name, weslMember] as [string, WeslMember];
    });
    const members = Object.fromEntries(memberEntries);
    const weslStruct: WeslStruct = { members };
    return { [structName]: weslStruct };
  });

  const structArray = JSON.stringify(jsStructs, null, 2);
  return `export const structs = ${structArray};`;
}

function originalTypeName(typeRef: TypeRefElem): string {
  const { name } = typeRef;
  if (typeof name === "string") {
    return name;
  }
  return name.originalName;
}
