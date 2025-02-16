import { debugNames, srcLog } from "mini-parse";
import { DeclarationElem } from "./AbstractElems.ts";
import { identToString } from "./debug/ScopeToString.ts";
import { FlatImport } from "./FlattenTreeImport.ts";
import { LinkRegistryParams, VirtualLibraryFn } from "./Linker.ts";
import { ManglerFn, minimalMangle } from "./Mangler.ts";
import { ParsedRegistry } from "./ParsedRegistry.ts";
import { flatImports, parseSrcModule, WeslAST } from "./ParseWESL.ts";
import {
  Conditions,
  DeclIdent,
  exportDecl,
  RefIdent,
  Scope,
  SrcModule,
} from "./Scope.ts";
import { stdEnumerant, stdFn, stdType } from "./StandardTypes.ts";
import { last } from "./Util.ts";

export interface BindResults {
  /** global declarations that were referenced (these will need to be emitted in the link) */
  decls: DeclarationElem[];

  /** root level names (including names mangled due to conflict with earlier names) */
  globalNames: Set<string>;
}

export interface VirtualLibrary {
  /** function to generate the module */
  fn: VirtualLibraryFn;

  /** parsed AST for the module (constructed lazily) */
  ast?: WeslAST;
}

/** key is virtual module name */
export type VirtualLibrarySet = Record<string, VirtualLibrary>;

export interface BindIdentsParams
  extends Pick<LinkRegistryParams, "registry" | "conditions" | "mangler"> {
  rootAst: WeslAST;
  virtuals?: VirtualLibrarySet;
}

/**
 * Bind active reference idents to declaration Idents by mutating the refersTo: field
 * Also in this pass, set the mangledName: field for all active global declaration idents.
 *
 * @param parsed
 * @param conditions  only bind to/from idents that are valid with the current condition set
 * @return any new declaration elements found (they will need to be emitted)
 */
export function bindIdents(params: BindIdentsParams): BindResults {
  const { rootAst, registry, virtuals } = params;
  const { conditions = {}, mangler = minimalMangle } = params;

  /* 
    For each module's scope, search through the scope tree to find all ref idents
      - For each ref ident, search up the scope tree to find a matching decl ident
      - If no local match is found, check for partial matches with import statements
        - combine ident with import statement to match a decl in exporting module

    As global decl idents are found, mutate their mangled name to be globally unique.
*/
  const { rootScope } = rootAst;

  const globalNames = new Set<string>();
  const knownDecls = new Set<DeclIdent>();
  rootScope.idents.forEach(ident => {
    if (ident.kind === "decl") {
      ident.mangledName = ident.originalName;
      globalNames.add(ident.originalName);
      knownDecls.add(ident);
    }
  });

  const bindContext = {
    registry,
    conditions,
    knownDecls,
    foundScopes: new Set<Scope>(),
    globalNames,
    virtuals,
    mangler,
  };
  const foundDecls = bindIdentsRecursive(rootScope, bindContext);
  const decls = foundDecls.flatMap(d =>
    d.declElem && isGlobal(d.declElem) ? [d.declElem] : [],
  );
  return { decls, globalNames };
}

interface BindContext {
  registry: ParsedRegistry;
  conditions: Record<string, any>;
  knownDecls: Set<DeclIdent>; // decl idents discovered so far
  foundScopes: Set<Scope>; // save work by not processing scopes multiple times
  globalNames: Set<string>; // root level names  used so far
  mangler: ManglerFn; // construct unique identifer names for global declarations
  virtuals?: VirtualLibrarySet;
}

/**
 * Recursively bind references to declarations in this scope and
 * any child scopes referenced by these declarations.
 * Uses a hash set of found declarations to avoid duplication
 * @ return any new declarations found
 */
function bindIdentsRecursive(
  scope: Scope,
  bindContext: BindContext,
): DeclIdent[] {
  // early exist if we've processed this scope before
  const { foundScopes, mangler } = bindContext;
  if (foundScopes.has(scope)) return [];
  foundScopes.add(scope);

  const { registry, conditions } = bindContext;
  const { globalNames, knownDecls, virtuals } = bindContext;
  const newDecls: DeclIdent[] = []; // new decl idents to process (and return)

  scope.idents.forEach(ident => {
    if (ident.kind === "ref") {
      if (!ident.refersTo && !ident.std) {
        const foundDecl =
          findDeclInModule(scope, ident) ??
          findDeclImport(ident, registry, conditions, virtuals);

        if (foundDecl) {
          const { decl: decl, srcModule } = foundDecl;
          ident.refersTo = decl;
          if (!knownDecls.has(decl)) {
            knownDecls.add(decl);
            const proposed = ident.originalName;
            setMangledName(proposed, decl, globalNames, srcModule, mangler);
            if (decl.declElem && isGlobal(decl.declElem)) {
              newDecls.push(decl);
            }
          }
        } else if (stdWgsl(ident.originalName)) {
          ident.std = true;
        } else {
          const { refIdentElem } = ident;
          if (refIdentElem) {
            const { srcModule, start, end } = refIdentElem;
            const { debugFilePath: filePath } = srcModule;
            const msg = `unresolved identifier in file: ${filePath}`;
            srcLog(srcModule.src, [start, end], msg);
          }
        }
      }
    }
  });

  // follow references from child scopes
  const newFromChildren = scope.children.flatMap(child => {
    return bindIdentsRecursive(child, bindContext);
  });

  // follow references from referenced declarations
  const newFromRefs = newDecls.flatMap(decl => {
    if (debugNames && !decl.scope) {
      console.log(`--- decl ${identToString(decl)} has no scope`);
      return [];
    }
    return bindIdentsRecursive(decl.scope, bindContext);
  });

  return [newDecls, newFromChildren, newFromRefs].flat();
}

/**
 * Mutate a DeclIdent to set a unique name for global linking,
 * using a mangling function to choose a unique name.
 * Also update the set of globally unique names.
 */
function setMangledName(
  proposedName: string,
  decl: DeclIdent,
  globalNames: Set<string>,
  srcModule: SrcModule,
  mangler: ManglerFn,
): void {
  if (!decl.mangledName) {
    let mangledName: string;
    if (decl.declElem && isGlobal(decl.declElem)) {
      const sep = proposedName.lastIndexOf("::");
      const name = sep === -1 ? proposedName : proposedName.slice(sep + 2);
      mangledName = mangler(decl, srcModule, name, globalNames);
    } else {
      mangledName = decl.originalName;
    }
    decl.mangledName = mangledName;
    globalNames.add(mangledName);
  }
}

function stdWgsl(name: string): boolean {
  return stdType(name) || stdFn(name) || stdEnumerant(name); // TODO add tests for enumerants case (e.g. var x = read;)
}

/** search earlier in the scope and in parent scopes to find a matching decl ident */
function findDeclInModule(
  scope: Scope,
  ident: RefIdent,
): FoundDecl | undefined {
  const { parent } = scope;
  const { originalName } = ident;

  const found = scope.idents.find(
    i => i.kind === "decl" && i.originalName === originalName,
  );
  if (found)
    return {
      decl: found as DeclIdent,
      srcModule: ident.refIdentElem.srcModule,
    };

  // recurse to check all idents in parent scope
  if (parent) {
    return findDeclInModule(parent, ident);
  }
}

/** Match a reference identifier to a declaration in
 * another module via an import statement */
function findDeclImport(
  refIdent: RefIdent,
  parsed: ParsedRegistry,
  conditions: Conditions,
  virtuals?: VirtualLibrarySet,
): FoundDecl | undefined {
  const flatImps = flatImports(refIdent.ast);

  // find module path by combining identifer reference with import statement
  const modulePathParts = matchingImport(refIdent, flatImps); // module path in array form

  if (modulePathParts) {
    return findExport(modulePathParts, parsed, conditions, virtuals);
  }
}

/** using the flattened import array, find an import that matches a provided identifier */
function matchingImport(
  ident: RefIdent,
  flatImports: FlatImport[],
): string[] | undefined {
  const identParts = ident.originalName.split("::");
  for (const flat of flatImports) {
    if (flat.importPath.at(-1) === identParts.at(0)) {
      return [...flat.modulePath, ...identParts.slice(1)];
    }
  }
}

/** discovered declaration found during binding */
interface FoundDecl {
  srcModule: SrcModule;
  decl: DeclIdent;
}

/** @return an exported root element for the provided path */
function findExport(
  modulePathParts: string[],
  parsed: ParsedRegistry,
  conditions: Conditions = {},
  virtuals?: VirtualLibrarySet,
): FoundDecl | undefined {
  const modulePath = modulePathParts.slice(0, -1).join("::");
  const module =
    parsed.modules[modulePath] ??
    virtualModule(modulePathParts[0], conditions, virtuals); // LATER consider virtual modules with submodules

  if (!module) {
    // TODO show error with source location
    console.log(
      `ident ${modulePathParts.join("::")} in import statement, but module not found`,
    );
    return undefined;
  }

  const decl = exportDecl(module.rootScope, last(modulePathParts)!);
  if (decl) {
    return { srcModule: module.srcModule, decl };
  }
}

/** @return AST for a virtual module */
function virtualModule(
  moduleName: string,
  conditions: Conditions = {},
  virtuals?: VirtualLibrarySet,
): WeslAST | undefined {
  if (!virtuals) return undefined;
  const found = virtuals[moduleName];
  if (found) {
    const { ast, fn } = found;
    if (ast) return ast;
    const src = fn(conditions); // generate the virtual module
    const srcModule: SrcModule = {
      modulePath: moduleName,
      debugFilePath: moduleName,
      src,
    };
    found.ast = parseSrcModule(srcModule); // cache parsed virtual module
    return found.ast;
  }
}

export function isGlobal(elem: DeclarationElem): boolean {
  return ["alias", "const", "override", "fn", "struct", "gvar"].includes(
    elem.kind,
  );
}
