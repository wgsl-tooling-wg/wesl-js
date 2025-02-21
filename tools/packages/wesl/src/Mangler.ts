import { DeclIdent, SrcModule } from "./Scope.ts";
/**
 * A function for constructing a unique identifier name for a global declaration.
 * Global names must be unique in the linked wgsl.
 *
 * Three manglers are currently available:
 * . minimalMangle preserves original source names where possible
 * . underscoreMangle constructs long but predictable names for every declaration
 * . lengthPrefixMangle constructs long but predictable names for every declaration
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
 * Corresponds to "Underscore-count mangling" from [NameMangling.md](https://github.com/wgsl-tooling-wg/wesl-spec/blob/main/NameMangling.md)
 */
export function underscoreMangle(
  decl: DeclIdent,
  srcModule: SrcModule,
): string {
  const { modulePath } = srcModule;
  return [...modulePath.split("::"), decl.originalName]
    .map(v => {
      const underscoreCount = (v.match(/_/g) ?? []).length;
      if (underscoreCount > 0) {
        return "_" + underscoreCount + v;
      } else {
        return v;
      }
    })
    .join("_");
}

/**
 * Construct a globally unique name based on the declaration
 */
export function lengthPrefixMangle(
  decl: DeclIdent,
  srcModule: SrcModule,
): string {
  function codepointCount(text: string): number {
    return [...text].length;
  }
  const qualifiedIdent = [
    ...srcModule.modulePath.split("::"),
    decl.originalName,
  ];
  return "_" + qualifiedIdent.map(v => codepointCount(v) + v).join("");
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
