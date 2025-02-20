import { DeclIdent, SrcModule } from "./Scope.ts";
/**
 * A function for constructing a unique identifier name for a global declaration.
 * Global names must be unique in the linked wgsl.
 *
 * Two manglers are currently available:
 * . minimalMangle preserves original source names where possible
 * . underscoreMangle constructs long but predictable names for every declaration
 */
export type ManglerFn = (
  /** global declaration that needs a name */
  decl: DeclIdent,

  /** module that contains the declaration */
  srcModule: SrcModule,

  /** name at use site (possibly import as renamed from declaration) */
  proposedName: string,

  /** current set of mangled root level names for the linked result (read only) */
  globalNames: Set<string>,
) => string;

/**
 * Construct a globally unique name based on the declaration
 * module path separated by underscores.
 */
export function underscoreMangle(
  decl: DeclIdent,
  srcModule: SrcModule,
): string {
  const { modulePath } = srcModule;
  const escaped = modulePath.replaceAll("_", "__");
  const separated = escaped.replaceAll("::", "_");
  const mangled = separated + "_" + decl.originalName.replaceAll("_", "__");
  return mangled;
}

/**
 * ManglerFn to construct a globally unique name
 * using the requested name plus a uniquing number suffix if necessary
 */
export function minimalMangle(
  _d: DeclIdent,
  _s: SrcModule,
  proposedName: string,
  globalNames: Set<string>,
): string {
  return minimallyMangledName(proposedName, globalNames);
}

/**
 * Construct a globally unique name by using the requested name if possible
 * and appending a number suffix necessary
 */
export function minimallyMangledName(
  proposedName: string,
  globalNames: Set<string>,
): string {
  let renamed = proposedName;
  let conflicts = 0;

  // create a unique name
  while (globalNames.has(renamed)) {
    renamed = proposedName + conflicts++;
  }

  return renamed;
}
