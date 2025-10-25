import { type SrcMap, SrcMapBuilder, tracing } from "mini-parse";
import type { AbstractElem, ModuleElem } from "./AbstractElems.ts";
import { bindIdents, type EmittableElem } from "./BindIdents.ts";
import { LinkedWesl } from "./LinkedWesl.ts";
import { lowerAndEmit } from "./LowerAndEmit.ts";
import type { ManglerFn } from "./Mangler.ts";
import {
  type ParsedRegistry,
  parsedRegistry,
  parseIntoRegistry,
  parseLibsIntoRegistry,
  selectModule,
} from "./ParsedRegistry.ts";
import type { WeslAST } from "./ParseWESL.ts";
import type { Conditions, DeclIdent, SrcModule } from "./Scope.ts";
import { filterMap, mapValues } from "./Util.ts";
import type { WeslBundle } from "./WeslBundle.ts";

export type LinkerTransform = (boundAST: TransformedAST) => TransformedAST;

export interface WeslJsPlugin {
  transform?: LinkerTransform;
}

export interface TransformedAST
  extends Pick<WeslAST, "srcModule" | "moduleElem"> {
  globalNames: Set<string>;
  notableElems: Record<string, AbstractElem[]>;
}

export interface LinkConfig {
  plugins?: WeslJsPlugin[];
}

export interface LinkParams {
  /** record of file paths and wesl text for modules.
   *   key is module path or file path
   *     `package::foo::bar`, or './foo/bar.wesl', or './foo/bar'
   *   value is wesl src
   *
   *
   * Only accepts unix-style, relative filesystem paths that are valid WGSL identifiers
   * - Unix-style: Slashes as separators.
   * - Valid WGSL identifiers: No backslashes, no `..`, or other non-identifier symbols.
   * - Relative paths: They have to be relative to the wesl root.
   */
  weslSrc: Record<string, string>;

  /** name of root wesl module
   *    for an app, the root module normally contains the '@compute', '@vertex' or '@fragment' entry points
   *    for a library, the root module defines the public api fo the library
   *  can be specified as file path (./main.wesl), a module path (package::main), or just a module name (main)
   */
  rootModuleName?: string;

  /** For debug logging. Will be prepended to file paths. */
  debugWeslRoot?: string;

  /** runtime conditions for conditional compiling with @if and friends */
  conditions?: Conditions;

  /** libraries available for the link */
  libs?: WeslBundle[];

  /** generate wesl from code at runtime */
  virtualLibs?: Record<string, VirtualLibraryFn>;

  /** package name for the local sources (in addition to default "package::").
   * Enables imports like `import mypkg::foo` alongside `import package::foo`.
   * Package names with hyphens should be normalized to underscores. */
  packageName?: string;

  /** plugins and other configuration to use while linking */
  config?: LinkConfig;

  /** Host (ts/js) provided wgsl constants.
   * Users can import the values from wesl code via the `constants' virtual library:
   *  `import constants::num_lights;` */
  constants?: Record<string, string | number>;

  /** function to construct globally unique wgsl identifiers */
  mangler?: ManglerFn;
}

/** Generate a virtual WESL module based on a set of conditions. */
export type VirtualLibraryFn = (conditions: Conditions) => string;

/**
 * Link a set of WESL source modules (typically the text from .wesl files) into a single WGSL string.
 * Linking starts with a specified 'root' source module, and recursively incorporates code
 * referenced from other modules (in local files or libraries).
 *
 * Unreferenced (dead) code outside the root module is not included in the output WGSL.
 * Additionally the caller can specify conditions for to control conditional compilation.
 * Only code that is valid with the current conditions is included in the output.
 */
export async function link(params: LinkParams): Promise<LinkedWesl> {
  const { weslSrc, debugWeslRoot, libs = [], packageName } = params;
  const registry = parsedRegistry();
  parseIntoRegistry(weslSrc, registry, "package", debugWeslRoot);
  if (packageName) {
    parseIntoRegistry(weslSrc, registry, packageName, debugWeslRoot);
  }
  parseLibsIntoRegistry(libs, registry);
  const srcMap = linkRegistry({ registry, ...params });
  return new LinkedWesl(srcMap);
}

/** linker api for benchmarking */
export function _linkSync(params: LinkParams): LinkedWesl {
  const { weslSrc, debugWeslRoot, libs = [], packageName } = params;
  const registry = parsedRegistry();
  parseIntoRegistry(weslSrc, registry, "package", debugWeslRoot);
  if (packageName) {
    parseIntoRegistry(weslSrc, registry, packageName, debugWeslRoot);
  }
  parseLibsIntoRegistry(libs, registry);
  const srcMap = linkRegistry({ registry, ...params });
  return new LinkedWesl(srcMap);
}

export interface LinkRegistryParams
  extends Pick<
    LinkParams,
    | "rootModuleName"
    | "conditions"
    | "virtualLibs"
    | "config"
    | "constants"
    | "mangler"
  > {
  registry: ParsedRegistry;
}

/** Link wesl from a registry of already parsed modules.
 *
 * This entry point is intended for users who want to link multiple times
 * from the same sources. (e.g. linking with different conditions
 * each time, or perhaps to produce multiple wgsl shaders
 * that share some sources.)
 */
export function linkRegistry(params: LinkRegistryParams): SrcMap {
  const bound = bindAndTransform(params);
  const { transformedAst, newDecls, newStatements } = bound;

  return SrcMapBuilder.build(
    emitWgsl(
      transformedAst.moduleElem,
      transformedAst.srcModule,
      newDecls,
      newStatements,
      params.conditions,
    ),
  );
}

export interface BoundAndTransformed {
  transformedAst: TransformedAST;
  newDecls: DeclIdent[];
  newStatements: EmittableElem[];
}

/** bind identifers and apply any transform plugins */
export function bindAndTransform(
  params: LinkRegistryParams,
): BoundAndTransformed {
  const { registry, mangler } = params;
  const { rootModuleName = "main", conditions = {} } = params;
  const rootAst = getRootModule(registry, rootModuleName);

  // setup virtual modules from code generation or host constants provided by the user
  const { constants, config } = params;
  let { virtualLibs } = params;
  if (constants) {
    virtualLibs = { ...virtualLibs, constants: constantsGenerator(constants) };
  }
  const virtuals = virtualLibs && mapValues(virtualLibs, fn => ({ fn }));

  /* --- Step #2   Binding Idents --- */
  // link active Ident references to declarations, and uniquify global declarations
  const bindParams = { rootAst, registry, conditions, virtuals, mangler };
  const bindResults = bindIdents(bindParams);
  const { globalNames, decls: newDecls, newStatements } = bindResults;

  const transformedAst = applyTransformPlugins(rootAst, globalNames, config);
  return { transformedAst, newDecls, newStatements };
}

function constantsGenerator(
  constants: Record<string, string | number>,
): () => string {
  return () =>
    Object.entries(constants)
      .map(([name, value]) => `const ${name} = ${value};`)
      .join("\n");
}

/** get a reference to the root module, selecting by module name */
function getRootModule(
  parsed: ParsedRegistry,
  rootModuleName: string,
): WeslAST {
  const rootModule = selectModule(parsed, rootModuleName);
  if (!rootModule) {
    if (tracing) {
      console.log(`parsed modules: ${Object.keys(parsed.modules)}`);
      console.log(`root module not found: ${rootModuleName}`);
    }
    throw new Error(`Root module not found: ${rootModuleName}`);
  }
  return rootModule;
}

/** run any plugins that transform the AST */
function applyTransformPlugins(
  rootModule: WeslAST,
  globalNames: Set<string>,
  config?: LinkConfig,
): TransformedAST {
  const { moduleElem, srcModule } = rootModule;

  // for now only transform the root module
  const startAst = { moduleElem, srcModule, globalNames, notableElems: {} };
  const plugins = config?.plugins ?? [];
  const transforms = filterMap(plugins, plugin => plugin.transform);
  const transformedAst = transforms.reduce(
    (ast, transform) => transform(ast),
    startAst,
  );

  return transformedAst;
}

/** traverse the AST and emit WGSL */
function emitWgsl(
  rootModuleElem: ModuleElem,
  srcModule: SrcModule,
  newDecls: DeclIdent[],
  newStatements: EmittableElem[],
  conditions: Conditions = {},
): SrcMapBuilder[] {
  /* --- Step #3   Writing WGSL --- */ // note doesn't require the scope tree anymore

  // emit any new statements (module level const asserts)
  const prologueBuilders = newStatements.map(s => {
    const { elem, srcModule } = s;
    const { src: text, debugFilePath: path } = srcModule;
    const builder = new SrcMapBuilder({ text, path });
    lowerAndEmit({ srcBuilder: builder, rootElems: [elem], conditions });
    builder.addNl();
    return builder;
  });

  const rootBuilder = new SrcMapBuilder({
    text: srcModule.src,
    path: srcModule.debugFilePath,
  });
  lowerAndEmit({
    srcBuilder: rootBuilder,
    rootElems: [rootModuleElem],
    conditions,
    extracting: false,
  });

  const declBuilders = newDecls.map(decl => {
    const builder = new SrcMapBuilder({
      text: decl.srcModule.src,
      path: decl.srcModule.debugFilePath,
    });
    // Skip conditional filtering - these declarations were already validated by findValidRootDecls
    lowerAndEmit({
      srcBuilder: builder,
      rootElems: [decl.declElem!],
      conditions,
      skipConditionalFiltering: true,
    });
    return builder;
  });

  return [...prologueBuilders, rootBuilder, ...declBuilders];
}

/* ---- Commentary on present and future features ---- */
/*

LATER
- distinguish between global and local declaration idents (only global ones need be uniquified)

Conditions
- conditions are attached to the AST elements where they are defined
  - only conditionally valid elements are emitted
- consolidated conditions are attached to Idents
  - only conditionally valid ref Idents are bound, and only to conditionaly valid declarations
  - a condition stack (akin to the scope stack) is maintained while parsing to attach consolidated conditions to Idents
- re-linking with new conditions, conservatively 
  - clear all mutated Ident fields (refersTo and mangled links) 
  - re-bind Idents, re-emit 

Generics & specialization
- attach generic parameters to ref and decl Idents, effectively creating a new Ident for each specialization
- generate specialized elements at emit time, by checking the generic parameters of the decl ident

Incrementally rebuilding
- unchanged files don't need to be reparsed, only reparse dirty files.
- support reflection only mode? no need to bind idents or emit for e.g. vite/IDE plugin generating reflection types 

Parallel Processing (coarse grained via webworkers)
- Parsing each module can be done in parallel
- binding could be done partially in parallel? (esbuild doesn't parallelize here though)
  - finding the declaration for each local ident could be done in parallel by module
  - matching 
- Emitting could be easily modified to be done in partially in parallel
  - traversing the AST to list the top level elements to emit could be done serially
  - the text for each top level element could be emitted in parallel (presumably the bulk of the work)
  - the merged text can be assembled serially

*/
