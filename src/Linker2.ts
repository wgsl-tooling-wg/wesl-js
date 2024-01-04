import { ImportElem } from "./AbstractElems.js";
import { ModuleRegistry2, TextModuleExport2 } from "./ModuleRegistry2.js";
import { TextModule2, parseModule2 } from "./ParseModule2.js";

/** parse source text for #import directives, return wgsl with all imports injected */
export function linkWgsl2(
  src: string,
  registry: ModuleRegistry2,
  extParams: Record<string, any> = {}
): string {
  const srcModule = parseModule2(src);
  const srcNoImports = rmImports(srcModule);
  const importedText = resolveImports({
    srcModule,
    registry,
    extParams,
    imported: new Set(),
  });
  return srcNoImports + "\n\n" + importedText;
}

interface ResolveArgs {
  /** load all imports specified in this module */
  srcModule: TextModule2;

  /** find imports in this registry */
  registry: ModuleRegistry2;

  /** imports already resolved (export name changed possibly changed by 'as', with import params) */
  imported: Set<string>;

  /** params provided by the linkWsgl caller */
  extParams: Record<string, any>;
}

/** load all the imports from a module, recursively loading imports from imported modules */
function resolveImports(args: ResolveArgs): string {
  const { srcModule, registry } = args;
  const toResolve: TextModule2[] = [];

  // note: we import breadth first so that parent fn names take precedence

  // collect text from direct imports
  const importedTexts = srcModule.imports.flatMap((imp) => {
    const importing = registry.getModuleExport(imp.name, imp.from);
    if (!importing) {
      console.error(`#import "${imp.name}" not found position ${imp.start}`); // LATER add source line number
      return [];
    } else if (importing.kind === "text") {
      const imported = loadExportText(imp, importing);
      toResolve.push(importing.module);
      return [imported];
    } else {
      throw new Error("NYI");
    }
  });

  // collect text from imported module imports
  const nestedImports = toResolve.map((importModule) => {
    return resolveImports({
      ...args,
      srcModule: importModule,
    });
  });
  return [...importedTexts, nestedImports].join("\n\n");
}

/** edit src to remove #imports */
function rmImports(srcModule: TextModule2): string {
  const src = srcModule.src;
  const startEnds = srcModule.imports.flatMap((imp) => [imp.start, imp.end]);
  const slicePoints = [0, ...startEnds, src.length];
  const edits = grouped(slicePoints, 2);
  return edits.map(([start, end]) => src.slice(start, end)).join("\n");
}

/** extract some exported text from a module, replace export params with corresponding import arguments */
function loadExportText(
  importElem: ImportElem,
  importing: TextModuleExport2
): string {
  const exp = importing.export;
  const { src: exportModuleSrc } = importing.module;
  const { start, end } = exp.ref;
  const exportSrc = exportModuleSrc.slice(start, end);

  /* replace export args with import arg values */
  const importArgs = importElem.args ?? [];
  const entries = exp.args.map((p, i) => [p, importArgs[i]]);
  if (importElem.as) entries.push([exp.name, importElem.as]); // rename 'as' imports, e.g. #import foo as 'newName'
  const importParams = Object.fromEntries(entries);
  return replaceTokens2(exportSrc, importParams);

  // TODO load referenced calls from the imported text..
  // see exp.ref.children
}

const tokenRegex = /\b(\w+)\b/gi;
export function replaceTokens2(
  text: string,
  replace: Record<string, string>
): string {
  return text.replaceAll(tokenRegex, (s) => (s in replace ? replace[s] : s));
}

/** return an array partitioned into possibly overlapping groups */
function grouped<T>(a: T[], size: number, stride = size): T[][] {
  const groups = [];
  for (let i = 0; i < a.length; i += stride) {
    groups.push(a.slice(i, i + size));
  }
  return groups;
}
