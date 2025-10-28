import { type SrcMap, SrcMapBuilder, tracing } from "mini-parse";
import type { AbstractElem, ModuleElem } from "./AbstractElems.ts";
import {
  bindIdents,
  type EmittableElem,
  type VirtualLibrarySet,
} from "./BindIdents.ts";
import { LinkedWesl } from "./LinkedWesl.ts";
import { lowerAndEmit } from "./LowerAndEmit.ts";
import type { ManglerFn } from "./Mangler.ts";
import {
  BundleResolver,
  CompositeResolver,
  type ModuleResolver,
  RecordResolver,
} from "./ModuleResolver.ts";
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
  /** Module resolver for lazy loading (NEW API - preferred)
   * Replaces weslSrc for lazy module loading.
   * If provided, weslSrc will be ignored. */
  resolver?: ModuleResolver;

  /** record of file paths and wesl text for modules (LEGACY API - still supported).
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
  weslSrc?: Record<string, string>;

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
  return new LinkedWesl(_linkSync(params));
}

/** linker api for benchmarking */
export function _linkSync(params: LinkParams): SrcMap {
  const { weslSrc, libs = [], packageName, debugWeslRoot } = params;
  const { resolver } = params;

  const resolvers: ModuleResolver[] = [];

  if (resolver) {
    resolvers.push(resolver);
  } else if (weslSrc) {
    resolvers.push(new RecordResolver(weslSrc, { packageName, debugWeslRoot }));
  } else {
    throw new Error("Either resolver or weslSrc must be provided");
  }

  if (libs.length > 0) {
    const libResolvers = createLibraryResolvers(libs, debugWeslRoot);
    resolvers.push(...libResolvers);
  }

  const finalResolver =
    resolvers.length === 1 ? resolvers[0] : new CompositeResolver(resolvers);

  return linkRegistry({ resolver: finalResolver, ...params });
}

function createLibraryResolvers(
  libs: WeslBundle[],
  debugWeslRoot?: string,
): ModuleResolver[] {
  const flattened = flattenLibraryTree(libs);
  return flattened.map(lib => new BundleResolver(lib, debugWeslRoot));
}

/** Flatten library dependency tree, deduplicating by object identity rather than package name.
 *
 * Some packages (like Lygia) provide multiple bundles in the same npm package
 * to enable tree shaking. All bundles share the same package name, so we deduplicate
 * by object identity to keep them distinct. Also handles circular dependencies correctly. */
function flattenLibraryTree(libs: WeslBundle[]): WeslBundle[] {
  const result: WeslBundle[] = [];
  const seen = new Set<WeslBundle>();

  function visit(bundle: WeslBundle) {
    if (seen.has(bundle)) return;
    seen.add(bundle);
    result.push(bundle);
    bundle.dependencies?.forEach(visit);
  }

  libs.forEach(visit);
  return result;
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
  resolver: ModuleResolver;
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

/** Bind identifiers and apply transform plugins */
export function bindAndTransform(
  params: LinkRegistryParams,
): BoundAndTransformed {
  const { resolver, mangler, constants, config } = params;
  const { rootModuleName = "main", conditions = {} } = params;

  const modulePath = normalizeModuleName(rootModuleName);
  const rootAst = getRootModule(resolver, modulePath, rootModuleName);

  const virtuals = setupVirtualLibs(params.virtualLibs, constants);

  const bindParams = {
    rootAst,
    resolver,
    conditions,
    virtuals,
    mangler,
  };
  const bindResults = bindIdents(bindParams);
  const { globalNames, decls: newDecls, newStatements } = bindResults;

  const transformedAst = applyTransformPlugins(rootAst, globalNames, config);
  return { transformedAst, newDecls, newStatements };
}

/** Convert root module name to module path format.
 * Accepts: module path (package::foo), file path (./foo.wesl), or name (foo) */
export function normalizeModuleName(name: string): string {
  if (name.includes("::")) return name;
  if (name.includes("/") || name.endsWith(".wesl") || name.endsWith(".wgsl")) {
    const stripped = name.replace(/\.(wesl|wgsl)$/, "").replace(/^\.\//, "");
    return "package::" + stripped.replaceAll("/", "::");
  }
  return "package::" + name;
}

/** Resolve root module AST or throw if not found. */
function getRootModule(
  resolver: ModuleResolver,
  modulePath: string,
  rootModuleName: string,
): WeslAST {
  const rootAst = resolver.resolveModule(modulePath);
  if (!rootAst) {
    if (tracing) {
      console.log(
        `root module not found: ${modulePath} (from ${rootModuleName})`,
      );
    }
    throw new Error(`Root module not found: ${rootModuleName}`);
  }
  return rootAst;
}

/** Create virtual library set from code generators and host constants. */
function setupVirtualLibs(
  virtualLibs: Record<string, VirtualLibraryFn> | undefined,
  constants: Record<string, string | number> | undefined,
): VirtualLibrarySet | undefined {
  let libs = virtualLibs;
  if (constants) {
    const constantsGen = () =>
      Object.entries(constants)
        .map(([name, value]) => `const ${name} = ${value};`)
        .join("\n");
    libs = { ...libs, constants: constantsGen };
  }
  return libs && mapValues(libs, fn => ({ fn }));
}

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

function emitWgsl(
  rootModuleElem: ModuleElem,
  srcModule: SrcModule,
  newDecls: DeclIdent[],
  newStatements: EmittableElem[],
  conditions: Conditions = {},
): SrcMapBuilder[] {
  const prologueBuilders = newStatements.map(s => emitStatement(s, conditions));

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

  const declBuilders = newDecls.map(decl => emitDecl(decl, conditions));

  return [...prologueBuilders, rootBuilder, ...declBuilders];
}

function emitStatement(
  s: EmittableElem,
  conditions: Conditions,
): SrcMapBuilder {
  const { elem, srcModule } = s;
  const { src: text, debugFilePath: path } = srcModule;
  const builder = new SrcMapBuilder({ text, path });
  lowerAndEmit({ srcBuilder: builder, rootElems: [elem], conditions });
  builder.addNl();
  return builder;
}

/** Skip conditional filtering because findValidRootDecls already validated these declarations */
function emitDecl(decl: DeclIdent, conditions: Conditions): SrcMapBuilder {
  const { src: text, debugFilePath: path } = decl.srcModule;
  const builder = new SrcMapBuilder({ text, path });
  lowerAndEmit({
    srcBuilder: builder,
    rootElems: [decl.declElem!],
    conditions,
    skipConditionalFiltering: true,
  });
  return builder;
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
