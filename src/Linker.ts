import {
  declAdd,
  globalDeclarations,
  resolveNameConflicts
} from "./Declarations.js";
import { ModuleRegistry, TextModuleExport } from "./ModuleRegistry.js";
import { endImportRegex, importRegex, replaceTokens } from "./Parsing.js";

/*
 * The linker supports import/export of wgsl code fragments.
 *
 * The user registers exportable fragments into a ModuleRegistry,
 * and then calls linkWgsl to combine fragments together.
 *
 * Code fragments are scanned for #export statements by ParseModule as code is
 * added to the ModuleRegistry. Alternately users can provide a function
 * that generates code fragments on demand.
 *
 * Exports are grouped into modules for organizational purposes. Modules
 * share a name, and text modules can each have their own templating scheme.
 *
 * Imports are resolved when linkWgsl is called, by scanning code
 * fragments for #import statements. Importing is recursive, exported
 * code can import other code fragments.
 *
 * Top level function names and struct names are renamed on import
 * to avoid conflict, so myFunction() may get renamed to myFunction_1().
 * Referenced to renamed functions and structs are also renamed.
 *
 * To ease adoption into existing workflows, the linker runs entirely
 * at runtime, and the syntax is compatible with tools that read vanilla wgsl.
 */

/** A named set of exportable code fragments */
export type WgslModule = TextModule | GeneratorModule;

export interface ModuleBase {
  /** name of module e.g. myPackage.myModule */
  name: string;
  exports: Export[];
}

/** module with exportable text fragments that are optionally transformed by a templating engine */
export interface TextModule extends ModuleBase {
  template?: string;
  exports: TextExport[];
}

/** module with exportable text generated by a function */
export interface GeneratorModule extends ModuleBase {
  exports: GeneratorExport[];
}

/** a single exportable text fragment */
export type Export = TextExport | GeneratorExport;

export interface ExportBase {
  /** name of function or struct being exported */
  name: string;
  params: string[];
}

export interface TextExport extends ExportBase, TextInsert {}

/** a code fragment or two to be inserted */
export interface TextInsert {
  /**  text to be inserted at #import location */
  src: string;

  /** text to be inserted at root level of #import wgsl file (not inside fn) */
  rootSrc?: string;
}

export type CodeGenFn = (params: Record<string, string>) => string | TextInsert;

export interface GeneratorExport extends ExportBase {
  generate: CodeGenFn;
}

/** parse shader text for imports, return wgsl with all imports injected */
export function linkWgsl(src: string, registry: ModuleRegistry): string {
  return insertImportsRecursive(src, registry, new Set(), 0);
}

/** Find #import directives in src text and insert the module export text */
function insertImportsRecursive(
  src: string,
  registry: ModuleRegistry,
  imported: Set<string>,
  conflictCount: number
): string {
  const out: string[] = [];
  const topOut: string[] = [];
  let importReplacing = false; // true while we're reading lines inside an importReplace

  const declarations = globalDeclarations(src);

  // scan through the lines looking for #import directives
  src.split("\n").forEach((line, lineNum) => {
    const importMatch = line.match(importRegex);
    if (importMatch) {
      const groups = importMatch.groups;
      importReplacing = checkImportReplace(importReplacing, groups, line, lineNum);

      // import module text
      const importName = groups!.name;
      const params = groups?.params?.split(",").map(p => p.trim()) ?? [];
      const asRename = groups?.importAs;
      const moduleName = groups?.importFrom;
      const _args = { importName, moduleName, registry, params, asRename };
      const args = { ..._args, imported, lineNum, declarations, line, conflictCount };
      const [insertSrc, rootSrc] = importModule(args);
      const resolved = [insertSrc, rootSrc].map(s => {
        const result = resolveNameConflicts(s, declarations, conflictCount);
        result.conflicted && conflictCount++;
        return result;
      });
      out.push(resolved[0].src);
      topOut.push(resolved[1].src);
      resolved.map(({ declared }) => declAdd(declarations, declared));
    } else if (importReplacing) {
      const endImport = line.match(endImportRegex);
      if (endImport) {
        importReplacing = false;
      }
    } else {
      out.push(line);
    }
  });
  return out.join("\n").concat(topOut.join("\n"));
}

/** report an error for importReplace within importReplace */
function checkImportReplace(
  replacing: boolean,
  groups: Record<string, string> | undefined,
  line: string,
  lineNum: number
): boolean {
  if (groups?.importCmd === "importReplace") {
    console.assert(
      !replacing,
      `#importReplace while inside #importReplace line: ${lineNum}\n>>\t${line}`
    );
    return true;
  } else {
    return replacing;
  }
}

const emptyImport = ["", ""];

interface ImportModuleArgs {
  importName: string;
  asRename?: string;
  moduleName?: string;
  registry: ModuleRegistry;
  params: string[];
  imported: Set<string>;
  lineNum: number;
  line: string;
  conflictCount: number;
}

/** import a an exported entry from a module.
 * @return the text to be inserted at the import and the text to be put at the root level */
function importModule(args: ImportModuleArgs): string[] {
  const { importName, asRename, moduleName, registry, params } = args;
  const { imported, lineNum, line, conflictCount } = args;

  const moduleExport = registry.getModuleExport(importName, moduleName);
  if (!moduleExport) {
    console.error(
      `#importReplace module export "${importName}" not found: at ${lineNum}\n>>\t${line}`
    );
    return emptyImport;
  }

  const importAs = asRename ?? moduleExport.export.name;
  const fullImport = fullImportName(importAs, moduleExport.module.name, params);
  if (imported.has(fullImport)) {
    return emptyImport;
  }

  imported.add(fullImport);

  const entries = moduleExport.export.params.map((p, i) => [p, params[i]]);
  const paramsRecord = Object.fromEntries(entries);

  let texts: string[];
  const exportName = moduleExport.export.name;

  if (moduleExport.kind === "text") {
    texts = templateText(moduleExport, paramsRecord, registry);
  } else if (moduleExport.kind === "function") {
    texts = generateText(moduleExport.export, paramsRecord);
  } else {
    console.error(`unexpected module export: ${JSON.stringify(moduleExport, null, 2)}`);
    return emptyImport;
  }
  const withImports = texts.map(s =>
    insertImportsRecursive(s, registry, imported, conflictCount)
  );

  const insertText = replaceText(withImports[0], exportName, asRename);
  return [insertText, texts[1]];
}

/** run a template, returning insert text src and root text src  */
function templateText(
  moduleExport: TextModuleExport,
  params: Record<string, string>,
  registry: ModuleRegistry
): string[] {
  const template = moduleExport.module.template;
  const { src, rootSrc = "" } = moduleExport.export;
  const templated = [src, rootSrc].map(s => applyTemplate(s, params, template, registry));
  return templated.map(s => replaceTokens(s, params));
}

/** run a src generator fn, returning insert text src and root text src  */
function generateText(exp: GeneratorExport, params: Record<string, string>): string[] {
  const result = exp.generate(params);
  if (typeof result === "string") {
    return [result, ""];
  } else {
    const { src, rootSrc = "" } = result;
    return [src, rootSrc];
  }
}

/** @return string of a named import with parameters, for deduplication */
function fullImportName(
  importName: string,
  moduleName: string,
  params: string[]
): string {
  return `${moduleName}.${importName}(${params.join(",")})`;
}

/** run a template processor if one is defined for this module */
function applyTemplate(
  text: string,
  templateParams: Record<string, string>,
  template: string | undefined,
  registry: ModuleRegistry
): string {
  if (text && template) {
    const applyTemplate = registry.getTemplate(template);
    if (applyTemplate) {
      return applyTemplate(text, templateParams);
    } else {
      console.warn(`template ${template} not registered`);
    }
  }
  return text;
}

/** optinally find and replace a string (to support import as renaming) */
function replaceText(text: string | undefined, find: string, replace?: string): string {
  if (!text) {
    return "";
  } else if (!replace) {
    return text;
  } else {
    return text.replace(find, replace);
  }
}
