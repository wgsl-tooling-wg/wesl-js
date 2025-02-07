import { bindAndTransform } from "wesl";
import { typeRefToString } from "../../linker/src/RawEmit.js";
import {
  PluginExtension,
  PluginExtensionApi,
} from "../../plugin/src/PluginExtension.js"; // TODO fix type exports from wesl-plugin

export interface WeslStruct {
  members: Record<string, WeslMember>;
}

export interface WeslMember {
  type: string;
}

export const wgslReflectExtension: PluginExtension = {
  extensionName: "wgsl_reflect",
  emitFn: emitReflectJs,
};

/** Emit a JavaScript WeslStruct that describes the shape of a wgsl struct */
async function emitReflectJs(
  baseId: string,
  api: PluginExtensionApi,
): Promise<string> {
  const registry = await api.weslRegistry();
  const main = await api.weslMain(baseId);

  /** run bind so we can get the mangled name for structs */
  bindAndTransform(registry, main, {});
  const astStructs = Object.entries(registry.modules).flatMap(([, module]) =>
    module.moduleElem.contents.filter(e => e.kind === "struct"),
  );

  const jsStructs = astStructs.map(s => {
    const structName = s.name.ident.mangledName!;
    const memberEntries = s.members.map(m => {
      const weslMember: WeslMember = { type: typeRefToString(m.typeRef) };
      return [m.name.name, weslMember] as [string, WeslMember];
    });
    const members = Object.fromEntries(memberEntries);
    const weslStruct: WeslStruct = { members };
    return { [structName]: weslStruct };
  });

  const structArray = JSON.stringify(jsStructs, null, 2);
  return `export const structs = ${structArray};`;
}
